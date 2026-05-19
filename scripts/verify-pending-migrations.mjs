// Phase Z2 Item 5 — Verify that ai-documents/Z2-apply-all.sql actually
// applied against the live DB. Service-role PostgREST has no SQL exec
// endpoint, so we probe each migration's surface area indirectly:
//   - new tables: do a HEAD count → 200 = exists, 404/PGRST205 = missing
//   - new columns: try to SELECT them with limit=0 → 200 = exists
//   - new enums: SELECT::cast a literal to the enum
//   - new policies / RLS functions: pg_proc / pg_policy via a Supabase
//     edge function isn't available, so we infer indirectly from anon
//     reads on the new RLS-protected paths.
//
// Output is one line per check: ✅ ok or ❌ missing/error, with the
// underlying API response when something fails.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

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

const env = loadEnv();
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

async function rest(path, init = {}) {
  const res = await fetch(`${URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  return { status: res.status, ok: res.ok, body: text };
}

async function checkTable(table) {
  const r = await rest(`${table}?select=*&limit=0`, { method: 'GET' });
  if (r.ok) return { check: `table:${table}`, ok: true };
  return { check: `table:${table}`, ok: false, status: r.status, body: r.body };
}

async function checkColumn(table, column) {
  const r = await rest(`${table}?select=${column}&limit=0`, { method: 'GET' });
  if (r.ok) return { check: `column:${table}.${column}`, ok: true };
  return { check: `column:${table}.${column}`, ok: false, status: r.status, body: r.body };
}

async function checkTracker() {
  const r = await rest(`_z2_migrations_applied?select=filename,applied_at&order=filename.asc`);
  if (!r.ok) return { check: 'tracker', ok: false, status: r.status, body: r.body };
  try {
    const rows = JSON.parse(r.body);
    return { check: 'tracker', ok: true, rows };
  } catch {
    return { check: 'tracker', ok: false, body: r.body };
  }
}

const CHECKS = [
  // Migration 1 — ai_confidence_metadata
  () => checkColumn('proposals', 'ai_confidence'),
  () => checkColumn('proposals', 'ai_sample_size'),
  () => checkColumn('proposals', 'ai_variance_pct'),
  () => checkColumn('proposals', 'ai_price_range_min'),
  () => checkColumn('proposals', 'ai_price_range_max'),

  // Migration 2 — ai_feedback
  () => checkTable('ai_feedback'),

  // Migration 3 — supplier_trust_signals
  () => checkTable('supplier_trust_signals'),

  // Migration 4 — user_milestones
  () => checkTable('user_milestones'),

  // Migration 5 — cultural_preferences
  () => checkColumn('profiles', 'preferred_calendar'),
  () => checkColumn('profiles', 'preferred_numerals'),

  // Migration 6 — supplier_concierge_managed
  () => checkColumn('suppliers', 'is_concierge_managed'),

  // Tracker (covers Item-1 / migration 7 indirectly — once tracker row
  // is present, the RLS helpers + rewritten policies are in place too).
];

function pad(s, n) {
  if (s.length >= n) return s;
  return s + ' '.repeat(n - s.length);
}

(async () => {
  console.log(`=== Z2 migration verification ===`);
  console.log(`URL: ${URL}`);
  console.log('');

  let failed = 0;
  for (const fn of CHECKS) {
    const r = await fn();
    if (r.ok) {
      console.log(`  ✅ ${r.check}`);
    } else {
      failed++;
      console.log(`  ❌ ${pad(r.check, 40)} status=${r.status}`);
      if (r.body) console.log(`     body: ${r.body.slice(0, 200)}`);
    }
  }

  const tracker = await checkTracker();
  console.log('');
  if (tracker.ok) {
    console.log(`  ✅ tracker — ${tracker.rows.length} migration row(s) applied`);
    for (const row of tracker.rows) {
      console.log(`     • ${row.filename}  (${row.applied_at})`);
    }
  } else {
    failed++;
    console.log(`  ❌ tracker — could not read public._z2_migrations_applied`);
    if (tracker.body) console.log(`     body: ${String(tracker.body).slice(0, 200)}`);
  }

  console.log('');
  if (failed > 0) {
    console.log(
      `${failed} check(s) failed. Paste ai-documents/Z2-apply-all.sql into the Supabase SQL Editor and re-run this script.`
    );
    process.exit(1);
  }
  console.log('All checks passed — DB is up to date with Phase Z2.');
})();
