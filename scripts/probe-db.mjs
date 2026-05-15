// Read-only probe: list tables and count rows in key tables.
// Reads creds from .env.local in repo root.

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env.local');
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const eq = l.indexOf('=');
      return [l.slice(0, eq).trim(), l.slice(eq + 1).trim().replace(/^"|"$/g, '')];
    })
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing SUPABASE env vars');
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

const TEST_EMAILS = [
  'ahmed.client.test@example.com',
  'm.supplier.test@example.com',
  'sara.admin.test@example.com',
];

async function listAuthUsers() {
  const { data, error } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  return data.users;
}

async function tableCount(table) {
  const { count, error } = await sb.from(table).select('*', { count: 'exact', head: true });
  if (error) return { table, error: error.message };
  return { table, count };
}

async function sampleProfile() {
  const { data, error } = await sb
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
  if (error) return { error: error.message };
  return data;
}

async function sampleSupplier() {
  const { data, error } = await sb
    .from('suppliers')
    .select('*')
    .limit(5);
  if (error) return { error: error.message };
  return data;
}

async function sampleCompany() {
  const { data, error } = await sb
    .from('companies')
    .select('*')
    .limit(5);
  if (error) return { error: error.message };
  return data;
}

async function listTables() {
  // Use information_schema via PostgREST RPC if available; otherwise try a known-shape probe.
  // Supabase exposes no built-in SQL endpoint via JS client, but we can try a custom RPC.
  // Fallback: probe known table names from the docs.
  const candidates = [
    'profiles',
    'companies',
    'suppliers',
    'rfqs',
    'proposals',
    'chats',
    'chat_messages',
    'agreements',
    'escrow_transactions',
    'deliveries',
    'reviews',
    'disputes',
    'notifications',
    'audit_log',
    'supplier_documents',
    'supplier_portfolio',
    'panic_alerts',
    'exhibitions',
    'service_types',
    'cities',
  ];
  const present = [];
  for (const t of candidates) {
    const { error } = await sb.from(t).select('*', { count: 'exact', head: true });
    if (!error) present.push(t);
  }
  return present;
}

(async () => {
  console.log('=== Supabase probe ===');
  console.log('URL:', url);

  console.log('\n--- Auth users ---');
  let users = [];
  try {
    users = await listAuthUsers();
    console.log('Total auth users:', users.length);
    for (const email of TEST_EMAILS) {
      const u = users.find((x) => x.email === email);
      console.log(
        email,
        u ? `FOUND id=${u.id} confirmed=${!!u.email_confirmed_at} created=${u.created_at}` : 'MISSING'
      );
    }
  } catch (e) {
    console.error('listUsers failed:', e.message);
  }

  console.log('\n--- Tables present (from candidate list) ---');
  let present = [];
  try {
    present = await listTables();
    console.log(present.join(', ') || '(none reachable via service role)');
  } catch (e) {
    console.error('listTables failed:', e.message);
  }

  console.log('\n--- Row counts (all reachable tables) ---');
  for (const t of present) {
    const r = await tableCount(t);
    console.log(`  ${t}:`, r.count ?? `error=${r.error}`);
  }

  console.log('\n--- profiles sample (raw) ---');
  const profs = await sampleProfile();
  console.log(JSON.stringify(profs, null, 2));

  console.log('\n--- companies sample ---');
  console.log(JSON.stringify(await sampleCompany(), null, 2));

  console.log('\n--- suppliers sample ---');
  console.log(JSON.stringify(await sampleSupplier(), null, 2));
})();
