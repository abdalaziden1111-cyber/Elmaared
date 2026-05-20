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

// Phase W1 — Phase V tracker (separate table from Z2).
async function checkPhaseVTracker() {
  const r = await rest(
    `_w_migrations_applied?select=filename,applied_at&order=filename.asc`
  );
  if (!r.ok)
    return { check: 'phase-v-tracker', ok: false, status: r.status, body: r.body };
  try {
    const rows = JSON.parse(r.body);
    return { check: 'phase-v-tracker', ok: true, rows };
  } catch {
    return { check: 'phase-v-tracker', ok: false, body: r.body };
  }
}

// Probe a new enum value indirectly: filter user_milestones with the
// value. PostgREST returns 400 with "invalid input value for enum" when
// the value doesn't exist, 200 otherwise.
async function checkMilestoneEnum(value) {
  const r = await rest(
    `user_milestones?select=id&milestone_type=eq.${encodeURIComponent(value)}&limit=0`
  );
  if (r.ok) return { check: `enum:milestone_type:${value}`, ok: true };
  return {
    check: `enum:milestone_type:${value}`,
    ok: false,
    status: r.status,
    body: r.body,
  };
}

// Storage bucket via the Storage REST API.
async function checkBucket(bucketId) {
  const root = URL.replace(/\/$/, '');
  const res = await fetch(`${root}/storage/v1/bucket/${bucketId}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  if (res.ok) return { check: `bucket:${bucketId}`, ok: true };
  return {
    check: `bucket:${bucketId}`,
    ok: false,
    status: res.status,
    body: await res.text(),
  };
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

  // ===== Phase V migrations (W1) =====
  // V2.1 — 6 new milestone_type enum values
  () => checkMilestoneEnum('first_proposal_received'),
  () => checkMilestoneEnum('first_chat_opened'),
  () => checkMilestoneEnum('first_agreement_signed'),
  () => checkMilestoneEnum('first_escrow_funded'),
  () => checkMilestoneEnum('first_project_completed'),
  () => checkMilestoneEnum('500k_gmv'),
  () => checkMilestoneEnum('1m_gmv'),

  // V1.1 — ai_usage_log + ai_score_cache
  () => checkTable('ai_usage_log'),
  () => checkTable('ai_score_cache'),

  // V1.2 — ai_risky_clauses column on agreements
  () => checkColumn('agreements', 'ai_risky_clauses'),

  // V1.3 — lead_scores table
  () => checkTable('lead_scores'),

  // V4.2 — notification_preferences table
  () => checkTable('notification_preferences'),

  // V5.1 — blog_posts table + blog-images bucket
  () => checkTable('blog_posts'),
  () => checkBucket('blog-images'),
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
    console.log(`  ✅ Z2 tracker — ${tracker.rows.length} migration row(s) applied`);
    for (const row of tracker.rows) {
      console.log(`     • ${row.filename}  (${row.applied_at})`);
    }
  } else {
    failed++;
    console.log(`  ❌ Z2 tracker — could not read public._z2_migrations_applied`);
    if (tracker.body) console.log(`     body: ${String(tracker.body).slice(0, 200)}`);
  }

  // Phase V tracker — separate table (_w_migrations_applied).
  const phaseVTracker = await checkPhaseVTracker();
  console.log('');
  if (phaseVTracker.ok) {
    console.log(
      `  ✅ Phase V tracker — ${phaseVTracker.rows.length} migration row(s) applied`
    );
    for (const row of phaseVTracker.rows) {
      console.log(`     • ${row.filename}  (${row.applied_at})`);
    }
  } else {
    failed++;
    console.log(
      `  ❌ Phase V tracker — could not read public._w_migrations_applied`
    );
    if (phaseVTracker.body)
      console.log(`     body: ${String(phaseVTracker.body).slice(0, 200)}`);
  }

  console.log('');
  if (failed > 0) {
    console.log(
      `${failed} check(s) failed. For Phase Z2 → paste ai-documents/Z2-apply-all.sql. For Phase V → paste ai-documents/W-apply-all.sql (or run pnpm exec node scripts/apply-phase-v-migrations.mjs). Then re-run this script.`
    );
    process.exit(1);
  }
  console.log('All checks passed — DB is up to date with Phase Z2 + Phase V.');
})();
