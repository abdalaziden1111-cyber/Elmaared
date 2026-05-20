#!/usr/bin/env node
// Phase U7 — one-command demo reset.
//
// Wipes the test-personas' demo state (RFQs / proposals / chats /
// agreements / escrow / invoices / milestones / demo suppliers), then
// re-runs seed-test-users + seed-demo so the live dev DB is in a known
// state.
//
// Run:   pnpm demo:reset
// Or:    pnpm demo:reset -- --yes    (skip confirmation prompt)
//
// Safe to run any number of times. Refuses to run without --yes outside
// a TTY (CI / cron) so it doesn't surprise someone running pnpm install
// hooks.

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const envText = readFileSync(resolve(REPO_ROOT, '.env.local'), 'utf8');
const env = Object.fromEntries(
  envText
    .split('\n')
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [
        l.slice(0, i).trim(),
        l.slice(i + 1).trim().replace(/^"|"$/g, ''),
      ];
    })
);

const sb = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const APP_URL = env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

const TEST_EMAILS = [
  'ahmed.client.test@example.com',
  'm.supplier.test@example.com',
  'sara.admin.test@example.com',
];
const DEMO_SUPPLIER_EMAILS = [
  'turki.qahtani.demo@example.com',
  'rahaf.hadrami.demo@example.com',
  'fahad.dossari.demo@example.com',
  'concierge.demo@example.com',
];

const argv = process.argv.slice(2);
const auto = argv.includes('--yes') || argv.includes('-y');

async function confirm() {
  if (auto) return true;
  if (!process.stdin.isTTY) {
    console.error('Refusing to run non-interactively without --yes flag.');
    return false;
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(
      `\nThis wipes demo data for ${TEST_EMAILS.join(', ')} on ${env.NEXT_PUBLIC_SUPABASE_URL}.\nContinue? (y/N) `,
      (answer) => {
        rl.close();
        resolve(/^y(es)?$/i.test(answer.trim()));
      },
    );
  });
}

async function findUserId(email) {
  for (let page = 1; page <= 10; page++) {
    const { data } = await sb.auth.admin.listUsers({ page, perPage: 200 });
    if (!data) return null;
    const hit = data.users.find((u) => u.email === email);
    if (hit) return hit.id;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function delIn(table, col, ids) {
  if (!ids?.length) return;
  const { error } = await sb.from(table).delete().in(col, ids);
  if (error) throw new Error(`delete ${table}.${col}: ${error.message}`);
}

async function wipeRfqIds(rfqIds) {
  if (rfqIds.length === 0) return { wiped: 0, skipped: 0 };

  // Separate RFQs by whether they have an escrow ledger. The escrow_events
  // table is append-only (legal audit) — once any escrow event fires for
  // an RFQ, that RFQ + its escrow + its agreement become un-deletable.
  // We respect that here and only wipe RFQs whose chain is still cleanable.
  const { data: escrowRows } = await sb
    .from('escrow_transactions')
    .select('id, rfq_id')
    .in('rfq_id', rfqIds);
  const dirtyRfqIds = new Set();
  for (const row of escrowRows ?? []) {
    const { count } = await sb
      .from('escrow_events')
      .select('*', { count: 'exact', head: true })
      .eq('escrow_id', row.id);
    if ((count ?? 0) > 0) dirtyRfqIds.add(row.rfq_id);
  }
  const cleanIds = rfqIds.filter((id) => !dirtyRfqIds.has(id));

  if (cleanIds.length === 0) return { wiped: 0, skipped: rfqIds.length };

  // Deepest leaves first.
  await delIn('reviews', 'rfq_id', cleanIds);
  await delIn('disputes', 'rfq_id', cleanIds);
  await delIn('deliveries', 'rfq_id', cleanIds);
  await delIn('invoices', 'rfq_id', cleanIds);
  // escrow_transactions WITHOUT events can still be deleted.
  await delIn('escrow_transactions', 'rfq_id', cleanIds);
  // agreement chain
  const agreementIds = (
    (await sb.from('agreements').select('id').in('rfq_id', cleanIds)).data ?? []
  ).map((a) => a.id);
  await delIn('agreement_revisions', 'agreement_id', agreementIds);
  await delIn('agreements', 'rfq_id', cleanIds);
  // chat chain
  const chatIds = (
    (await sb.from('chats').select('id').in('rfq_id', cleanIds)).data ?? []
  ).map((c) => c.id);
  await delIn('messages', 'chat_id', chatIds);
  await delIn('chats', 'rfq_id', cleanIds);
  // misc tail
  await delIn('notifications', 'rfq_id', cleanIds);
  await delIn('proposals', 'rfq_id', cleanIds);
  await delIn('rfqs', 'id', cleanIds);

  return { wiped: cleanIds.length, skipped: dirtyRfqIds.size };
}

async function wipeClientWorkspace(clientId) {
  const { data: rfqs } = await sb
    .from('rfqs')
    .select('id')
    .eq('client_id', clientId);
  await wipeRfqIds((rfqs ?? []).map((r) => r.id));
}

async function deleteUserDeep(email) {
  const id = await findUserId(email);
  if (!id) return;

  // Supplier-side cascade (suppliers FK to profiles via owner_id):
  const { data: supplierRow } = await sb
    .from('suppliers')
    .select('id')
    .eq('owner_id', id)
    .maybeSingle();
  if (supplierRow?.id) {
    const sid = supplierRow.id;
    await sb.from('supplier_trust_signals').delete().eq('supplier_id', sid);
    // proposals can reference the supplier — wipe before suppliers row.
    await sb.from('proposals').delete().eq('supplier_id', sid);
    await sb.from('supplier_portfolio').delete().eq('supplier_id', sid);
    await sb.from('suppliers').delete().eq('id', sid);
  }

  // Client-side cascade — anything referencing the user's company also
  // has to go before the company row itself can be deleted.
  const { data: companyRows } = await sb
    .from('companies')
    .select('id')
    .eq('owner_id', id);
  const companyIds = (companyRows ?? []).map((c) => c.id);
  if (companyIds.length) {
    await wipeClientWorkspace(id); // RFQs by client_id
    // Plus any RFQs referencing the company (client_id check above could
    // miss rows where client_id was nulled or rewritten by a prior bug).
    const { data: orphanRfqs } = await sb
      .from('rfqs')
      .select('id')
      .in('company_id', companyIds);
    await wipeRfqIds((orphanRfqs ?? []).map((r) => r.id));
    const cDel = await sb.from('companies').delete().in('id', companyIds);
    if (cDel.error) throw new Error(`companies delete: ${cDel.error.message}`);
  }

  // Tail-end orphans referencing the auth user directly.
  await sb.from('user_milestones').delete().eq('user_id', id);
  await sb.from('notifications').delete().eq('user_id', id);
  await sb.from('reviews').delete().eq('client_id', id);
  await sb.from('disputes').delete().eq('raised_by', id);
  await sb.from('audit_logs').delete().eq('actor_id', id);
  const pDel = await sb.from('profiles').delete().eq('id', id);
  if (pDel.error) throw new Error(`profile delete: ${pDel.error.message}`);

  const { error } = await sb.auth.admin.deleteUser(id, false);
  if (error) {
    throw new Error(`deleteUser ${email}: ${error.message}`);
  }
}

function runScript(scriptName) {
  console.log(`\n=== Running ${scriptName} ===`);
  const res = spawnSync('node', [resolve(REPO_ROOT, 'scripts', scriptName)], {
    stdio: 'inherit',
  });
  if (res.status !== 0) {
    throw new Error(`${scriptName} exited with code ${res.status}`);
  }
}

(async () => {
  console.log('=== Phase U7 demo reset ===');
  console.log('Target:', env.NEXT_PUBLIC_SUPABASE_URL);
  console.log(
    '\nNote: this preserves the 3 test users (ahmed/m./sara) and any RFQs',
  );
  console.log(
    'with escrow_events (immutable audit ledger). It wipes the demo-specific',
  );
  console.log(
    'suppliers + RFQs (RFQ-DEMO-*) and re-seeds them. Use this between demos.',
  );

  const proceed = await confirm();
  if (!proceed) {
    console.log('Aborted.');
    process.exit(0);
  }

  // Make sure the 3 test users exist before we try to seed demo data on
  // top. If any of them is missing (fresh DB), run seed-test-users first.
  const missingTest = [];
  for (const email of TEST_EMAILS) {
    if (!(await findUserId(email))) missingTest.push(email);
  }
  if (missingTest.length > 0) {
    console.log(
      `\n[setup] Missing test users — running seed-test-users to create: ${missingTest.join(', ')}`,
    );
    runScript('seed-test-users.mjs');
  } else {
    console.log('\n[setup] All 3 test users present — preserving them.');
  }

  console.log('\n[1/3] Wiping ahmed.client.test demo workspace (wipeable RFQs only)…');
  const clientId = await findUserId('ahmed.client.test@example.com');
  if (clientId) {
    const { data: allRfqs } = await sb
      .from('rfqs')
      .select('id, rfq_number')
      .eq('client_id', clientId);
    // Only target RFQs that look demo-seeded — leave any older real test
    // RFQs alone. (They may also be blocked by escrow_events anyway.)
    const demoIds = ((allRfqs ?? [])
      .filter((r) => r.rfq_number.startsWith('RFQ-DEMO-'))).map((r) => r.id);
    const result = await wipeRfqIds(demoIds);
    console.log(
      `  ✓ wiped ${result.wiped} demo RFQ(s) (${result.skipped} skipped — escrow ledger immutable)`,
    );
  }

  console.log('\n[2/4] Removing demo suppliers…');
  for (const email of DEMO_SUPPLIER_EMAILS) {
    try {
      await deleteUserDeep(email);
      console.log(`  ✓ ${email}`);
    } catch (e) {
      console.log(`  ⚠ ${email} skipped: ${e.message}`);
    }
  }

  // Phase W7 — Phase V wipes (belt-and-suspenders alongside seed's
  // inline wipes). Tables only exist after W1 migrations applied; we
  // tolerate "table not found" errors so the reset still works on a
  // pre-migration DB.
  console.log('\n[3/4] Wiping Phase V data (mock-seed rows + synthetic leads)…');
  const phaseVWipes = [
    () => sb.from('ai_usage_log').delete().eq('model', 'mock-seed'),
    () => sb.from('ai_score_cache').delete().like('hash', 'mock-seed-%'),
    () => sb.from('lead_scores').delete().like('narrative', '[mock]%'),
    () => sb.from('blog_posts').delete().like('slug', 'demo-w2-%'),
    // Synthetic lead auth users are wiped inline by seed-demo (it walks
    // emails lead.synth.NN@example.com and cascades through delete).
    // The pre-wipe here only handles tables — auth.users requires the
    // listUsers + deleteUser dance.
  ];
  for (const wipe of phaseVWipes) {
    const r = await wipe();
    if (r.error && !/does not exist|schema cache|relation/i.test(r.error.message)) {
      console.log(`  ⚠ wipe warning: ${r.error.message}`);
    }
  }
  console.log('  ✓ Phase V wipe pass complete');

  console.log('\n[4/4] Re-seeding demo data…');
  runScript('seed-demo.mjs');

  console.log('\n✅ Demo state ready. Quick links:');
  console.log(`  Login as client:  ${APP_URL}/ar/login`);
  console.log(`  → ahmed.client.test@example.com  /  TestClient2026!`);
  console.log(`  Dashboard:        ${APP_URL}/ar/dashboard`);
  console.log(`  Discover:         ${APP_URL}/ar/discover`);
  console.log(`  Settings:         ${APP_URL}/ar/dashboard/settings/profile`);
  console.log(`  AI bias card:     ${APP_URL}/ar/legal/ai-models`);
  console.log(`  Data rights:      ${APP_URL}/ar/legal/data-rights`);
  console.log('');
  console.log('  Phase V surfaces (W2 seeded):');
  console.log(`  Notifications:    ${APP_URL}/ar/dashboard/notifications`);
  console.log(`  Notif prefs:      ${APP_URL}/ar/dashboard/notifications/preferences`);
  console.log(`  Supplier KPI:     ${APP_URL}/ar/supplier/dashboard       (login as m.supplier.test)`);
  console.log(`  Admin leads:      ${APP_URL}/admin/leads                  (login as sara.admin.test)`);
  console.log(`  Admin analytics:  ${APP_URL}/admin/analytics`);
  console.log(`  Admin blog:       ${APP_URL}/admin/blog`);
  console.log(`  Public blog:      ${APP_URL}/ar/blog`);
  console.log(
    '\n  Specific RFQ + invoice URLs are printed by seed-demo above.',
  );
})().catch((err) => {
  console.error('\nFAIL:', err.message);
  process.exit(1);
});
