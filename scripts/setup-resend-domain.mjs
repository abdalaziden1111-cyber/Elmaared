// Phase Z2 — Item 2: Resend production-domain bootstrap.
//
// Idempotent CLI that walks a Resend account from "no domain" to "verified".
// Designed to be run multiple times safely:
//
//   pnpm mail:setup -- --domain app-exhibition.sa
//   pnpm mail:setup -- --domain app-exhibition.sa     # re-run after DNS publish
//   pnpm mail:setup -- --check                         # list current domains
//
// What it does:
//   1. Reads RESEND_API_KEY from .env.local.
//   2. Lists existing domains. If none, --check exits 0 with a summary.
//   3. Without --check, requires --domain (or RESEND_DOMAIN env). If the
//      domain isn't registered yet, POST /domains creates it.
//   4. Pretty-prints the DNS records Resend wants (SPF / DKIM ×3 / MX /
//      DMARC) as a copy-pasteable table, with the host/value pair the user
//      needs to add at their DNS provider.
//   5. Triggers POST /domains/:id/verify — Resend re-fetches the DNS and
//      flips status. Prints the resulting status.
//   6. If status is `verified`, prints the env line for .env.local /
//      Vercel: RESEND_FROM_EMAIL=noreply@<domain>.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const RESEND_API = 'https://api.resend.com';
const DMARC_VALUE_DEFAULT =
  'v=DMARC1; p=none; rua=mailto:dmarc@%DOMAIN%; ruf=mailto:dmarc@%DOMAIN%; fo=1';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env.local');

function loadEnv() {
  let raw = '';
  try {
    raw = readFileSync(envPath, 'utf8');
  } catch {
    return {};
  }
  return Object.fromEntries(
    raw
      .split('\n')
      .filter((l) => l && !l.startsWith('#') && l.includes('='))
      .map((l) => {
        const eq = l.indexOf('=');
        return [
          l.slice(0, eq).trim(),
          l.slice(eq + 1).trim().replace(/^"|"$/g, ''),
        ];
      })
  );
}

function parseArgs(argv) {
  const out = { check: false, domain: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--check') out.check = true;
    else if (a === '--domain') out.domain = argv[++i];
    else if (a.startsWith('--domain=')) out.domain = a.slice('--domain='.length);
  }
  return out;
}

async function api(path, opts = {}) {
  const env = loadEnv();
  const key = process.env.RESEND_API_KEY || env.RESEND_API_KEY;
  if (!key) {
    console.error('RESEND_API_KEY missing in .env.local');
    process.exit(1);
  }
  const res = await fetch(`${RESEND_API}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(
      `Resend ${opts.method ?? 'GET'} ${path} → ${res.status}: ${
        body?.message ?? body?.raw ?? 'unknown'
      }`
    );
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

function printRecordsTable(records, domain) {
  console.log('');
  console.log(`DNS records to publish at the provider that hosts ${domain}:`);
  console.log('');
  const rows = records.map((r) => ({
    type: r.type ?? r.record_type ?? '?',
    name: r.name ?? '@',
    value: r.value ?? r.content ?? '',
    priority: r.priority ?? '',
    ttl: r.ttl ?? 'Auto',
  }));
  rows.push({
    type: 'TXT',
    name: `_dmarc.${domain}`,
    value: DMARC_VALUE_DEFAULT.replaceAll('%DOMAIN%', domain),
    priority: '',
    ttl: 'Auto',
    note: 'Add separately — Resend does not create this for you.',
  });
  for (const r of rows) {
    console.log(`  [${r.type}] ${r.name}`);
    console.log(`    value: ${r.value}`);
    if (r.priority !== '') console.log(`    priority: ${r.priority}`);
    if (r.note) console.log(`    note: ${r.note}`);
    console.log('');
  }
}

async function listDomains() {
  const out = await api('/domains');
  return out?.data ?? [];
}

async function createDomain(domain) {
  return api('/domains', {
    method: 'POST',
    body: JSON.stringify({ name: domain, region: 'eu-west-1' }),
  });
}

async function getDomain(id) {
  return api(`/domains/${id}`);
}

async function verifyDomain(id) {
  return api(`/domains/${id}/verify`, { method: 'POST' });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const envFile = loadEnv();
  const domain = args.domain || process.env.RESEND_DOMAIN || envFile.RESEND_DOMAIN;

  if (args.check || !domain) {
    const list = await listDomains();
    console.log(`=== Resend domains (${list.length}) ===`);
    if (list.length === 0) {
      console.log('No domains registered yet.');
      console.log('');
      console.log(
        'Run with --domain <your-domain> to register one, e.g.:'
      );
      console.log('  pnpm mail:setup -- --domain app-exhibition.sa');
    } else {
      for (const d of list) {
        console.log(
          `  ${d.name.padEnd(30)} status=${d.status.padEnd(10)} region=${d.region}  id=${d.id}`
        );
      }
    }
    if (args.check) process.exit(0);
    if (!domain) process.exit(0);
  }

  const list = await listDomains();
  let entry = list.find((d) => d.name === domain);

  if (!entry) {
    console.log(`Creating domain ${domain} at Resend (region eu-west-1)…`);
    entry = await createDomain(domain);
    console.log(`Created. id=${entry.id} status=${entry.status}`);
  } else {
    console.log(
      `Domain already exists. id=${entry.id} status=${entry.status}`
    );
  }

  const full = await getDomain(entry.id);
  const records = full.records ?? full.data?.records ?? [];

  if (records.length > 0) {
    printRecordsTable(records, domain);
  } else {
    console.log('(no records returned by Resend — check the dashboard)');
  }

  console.log('Triggering verify…');
  let status = entry.status;
  try {
    const verifyRes = await verifyDomain(entry.id);
    status = verifyRes.status ?? verifyRes.data?.status ?? status;
    console.log(`Verify response: status=${status}`);
  } catch (err) {
    console.log(`Verify call failed: ${err.message}`);
    console.log(
      '(This is expected if the DNS records have not propagated yet. Re-run after publishing them.)'
    );
  }

  console.log('');
  if (status === 'verified') {
    console.log('Domain is VERIFIED. Update your env to:');
    console.log(`  RESEND_FROM_EMAIL=noreply@${domain}`);
    console.log(
      'Then redeploy (or restart `next dev`) and send a test email to confirm DKIM/SPF/DMARC pass.'
    );
  } else {
    console.log(
      `Status is ${status}. After you publish the DNS records above, re-run:`
    );
    console.log(`  pnpm mail:setup -- --domain ${domain}`);
    console.log(
      'Resend re-checks DNS on every verify call. Most providers propagate within 5–60 minutes.'
    );
  }
}

main().catch((err) => {
  console.error('FAIL:', err.message);
  if (err.body) console.error(JSON.stringify(err.body, null, 2));
  process.exit(1);
});
