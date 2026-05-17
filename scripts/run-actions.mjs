#!/usr/bin/env node
/**
 * Full user-journey action runner.
 *
 *   Phase 0: Guest pages render (no auth).
 *   Phase 1: Client (أحمد) — login, sidebar nav, create+publish booth RFQ.
 *   Phase 2: Supplier (محمد) — login, sidebar nav, submit proposal on the new RFQ.
 *   Phase 3: Client returns — compare, award, agreement → submit understanding.
 *   Phase 4: Admin (سارة) — login, visit each admin route.
 *
 * Records each action as PASS/FAIL/SKIP/INFO; writes JSON to /tmp/action-findings.json.
 * Pre-seed clean-up removes the test user's older "[E2E …]" RFQs so each run is
 * isolated (cascade deletes proposals, agreements, escrow_transactions).
 *
 * Run with:
 *   pnpm dev &                            # in another shell
 *   node scripts/run-actions.mjs          # this script
 */

import { chromium } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'node:fs';

const envText = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
const env = Object.fromEntries(
  envText
    .split('\n')
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      let v = l.slice(i + 1);
      if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
      return [l.slice(0, i), v];
    })
);

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';
const TEST_TAG = `[E2E ${new Date().toISOString().slice(0, 16)}]`;
const RUN_ID = Date.now();

const admin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const USERS = {
  client:   { email: 'ahmed.client.test@example.com',  password: 'TestClient2026!' },
  supplier: { email: 'm.supplier.test@example.com',    password: 'TestSupplier2026!' },
  admin:    { email: 'sara.admin.test@example.com',    password: 'TestAdmin2026!' },
};

const findings = [];
function record(phase, level, label, detail = '') {
  findings.push({ phase, level, label, detail, ts: new Date().toISOString() });
  const icon = level === 'PASS' ? '✓' : level === 'FAIL' ? '✗' : level === 'SKIP' ? '○' : 'ℹ';
  console.log(`  ${icon} [${level}] ${label}${detail ? ` — ${detail}` : ''}`);
}

function pageError(page, phase) {
  page.on('pageerror', (err) => record(phase, 'FAIL', `pageerror`, err.message.slice(0, 150)));
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const t = msg.text();
    if (t.includes('Failed to load resource') && /favicon|icon-/.test(t)) return;
    if (t.includes('Hydration')) record(phase, 'FAIL', 'hydration', t.slice(0, 150));
  });
}

async function login(page, role, phase) {
  await page.goto(`${BASE}/ar/login`);
  await page.fill('input[name="email"]', USERS[role].email);
  await page.fill('input[name="password"]', USERS[role].password);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.endsWith('/login'), { timeout: 15000 }),
    page.click('button[type="submit"]'),
  ]);
  const finalUrl = page.url().replace(BASE, '');
  record(phase, 'PASS', `${role} login`, `landed on ${finalUrl}`);
}

async function visit(page, phase, label, path, { expect200 = true, expectRedirectTo } = {}) {
  let res;
  try {
    res = await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  } catch (e) {
    record(phase, 'FAIL', label, `nav threw: ${e.message.slice(0, 100)}`);
    return null;
  }
  const status = res?.status() ?? 0;
  const finalUrl = page.url().replace(BASE, '');
  if (expectRedirectTo) {
    if (finalUrl.startsWith(expectRedirectTo)) {
      record(phase, 'PASS', label, `${path} → ${finalUrl}`);
    } else {
      record(phase, 'FAIL', label, `${path} → ${finalUrl} (expected ${expectRedirectTo})`);
    }
    return finalUrl;
  }
  if (status === 404) record(phase, 'FAIL', label, `${path} → 404`);
  else if (status >= 500) record(phase, 'FAIL', label, `${path} → HTTP ${status}`);
  else if (expect200 && status !== 200) record(phase, 'FAIL', label, `${path} → HTTP ${status}`);
  else record(phase, 'PASS', label, `${path} → ${status} (${finalUrl})`);
  return finalUrl;
}

// ============================================================
//  DB pre-clean
// ============================================================
async function preClean() {
  const { data: client } = await admin
    .from('profiles')
    .select('id')
    .eq('id', (await admin.auth.admin.listUsers()).data?.users?.find((u) => u.email === USERS.client.email)?.id ?? '')
    .single();
  if (!client) return;
  // Delete old E2E RFQs (cascades to proposals, agreements, escrow_transactions)
  const { data: oldRfqs } = await admin
    .from('rfqs')
    .select('id, title')
    .eq('client_id', client.id)
    .like('title', '[E2E%');
  if (oldRfqs?.length) {
    await admin.from('rfqs').delete().in('id', oldRfqs.map((r) => r.id));
    console.log(`  ℹ pre-clean: deleted ${oldRfqs.length} old [E2E …] RFQs`);
  }
}

// ============================================================
//  Main
// ============================================================
console.log(`▶ Action chain run — ${TEST_TAG}`);
console.log(`  base = ${BASE}`);
console.log(`  run-id = ${RUN_ID}`);

await preClean();

const browser = await chromium.launch({ headless: true });
let createdRfqId = null;
let createdProposalId = null;

try {
  // ============================================================
  //  PHASE 0 — Guest pages render
  // ============================================================
  console.log('\n━━━ PHASE 0: Guest (no auth) ━━━');
  {
    const ctx = await browser.newContext({ locale: 'ar-SA' });
    const page = await ctx.newPage();
    pageError(page, 'P0-guest');

    const guestRoutes = [
      ['Root /', '/'],
      ['Homepage AR', '/ar'],
      ['Homepage EN', '/en'],
      ['Login', '/ar/login'],
      ['Signup chooser', '/ar/signup'],
      ['Signup client step1', '/ar/signup/client/account'],
      ['Signup client step2', '/ar/signup/client/company'],
      ['Signup supplier step1', '/ar/signup/supplier/account'],
      ['Signup supplier step2', '/ar/signup/supplier/company'],
      ['Signup supplier step3', '/ar/signup/supplier/specializations'],
      ['Signup supplier step4', '/ar/signup/supplier/documents'],
      ['Forgot password', '/ar/forgot-password'],
      ['Reset password', '/ar/reset-password'],
      ['Verify email', '/ar/auth/verify-email'],
      ['Discover', '/ar/discover'],
      ['For clients', '/ar/for-clients'],
      ['For suppliers', '/ar/for-suppliers'],
      ['How it works', '/ar/how-it-works'],
      ['Pricing', '/ar/pricing'],
    ];
    for (const [label, path] of guestRoutes) await visit(page, 'P0-guest', label, path);

    // Click first supplier card in /discover (if any seeded)
    await page.goto(`${BASE}/ar/discover`);
    const firstCard = page.locator('a[href^="/discover/"]').first();
    if (await firstCard.count()) {
      const href = await firstCard.getAttribute('href');
      await Promise.all([
        page.waitForURL(/\/discover\/[0-9a-f-]+$/i, { timeout: 10000 }).catch(() => null),
        firstCard.click(),
      ]);
      const finalUrl = page.url().replace(BASE, '');
      if (/\/discover\/[0-9a-f-]+/.test(finalUrl)) {
        record('P0-guest', 'PASS', 'discover card click', `${href} → ${finalUrl}`);
      } else {
        record('P0-guest', 'FAIL', 'discover card click', `${href} → ${finalUrl}`);
      }
    } else {
      record('P0-guest', 'SKIP', 'discover card click', 'no supplier cards seeded');
    }

    // Protected-route gates while unauthenticated
    for (const [label, path] of [
      ['Dashboard gate', '/ar/dashboard'],
      ['Supplier gate', '/ar/supplier'],
      ['Admin gate', '/admin'],
    ]) {
      await visit(page, 'P0-guest', label, path, { expectRedirectTo: '/ar/login' });
    }

    await ctx.close();
  }

  // ============================================================
  //  PHASE 1 — Client creates + publishes RFQ
  // ============================================================
  console.log('\n━━━ PHASE 1: Client (أحمد) — create RFQ ━━━');
  {
    const ctx = await browser.newContext({ locale: 'ar-SA' });
    const page = await ctx.newPage();
    pageError(page, 'P1-client');

    await login(page, 'client', 'P1-client');

    // Sidebar pages
    for (const [label, path] of [
      ['Dashboard home', '/ar/dashboard'],
      ['RFQs list', '/ar/dashboard/rfqs'],
      ['Notifications', '/ar/dashboard/notifications'],
      ['Discover (from dashboard)', '/ar/discover'],
    ]) {
      await visit(page, 'P1-client', label, path);
    }

    // Click sidebar "+ طلب جديد" via the RFQs list
    await page.goto(`${BASE}/ar/dashboard/rfqs`);
    const newBtn = page.getByRole('link', { name: /طلب جديد/ });
    if (await newBtn.count()) {
      await newBtn.first().click();
      await page.waitForURL(/\/dashboard\/rfqs\/new/, { timeout: 5000 });
      record('P1-client', 'PASS', 'click + طلب جديد', `→ ${page.url().replace(BASE, '')}`);
    } else {
      await visit(page, 'P1-client', 'fallback nav to new', '/ar/dashboard/rfqs/new');
    }

    // Step 0 — Service
    const boothBtn = page.getByRole('button', { name: /تصميم وتنفيذ أجنحة/ });
    await boothBtn.click();
    record('P1-client', 'PASS', 'wizard step 0', 'picked تصميم وتنفيذ أجنحة');

    // Step 1 — Details (booth-specific)
    // Booth detail FormFields have no `name` prop, so getByLabel can't find
    // them — fall back to label → following-sibling input.
    const labelInput = (txt) =>
      page.locator(`xpath=//label[normalize-space()=${JSON.stringify(txt)}]/following-sibling::input[1]`);
    const labelSelect = (txt) =>
      page.locator(`xpath=//label[normalize-space()=${JSON.stringify(txt)}]/following-sibling::select[1]`);

    const title = `${TEST_TAG} جناح LEAP تجريبي ${RUN_ID}`;
    await page.getByLabel('عنوان الطلب').fill(title);
    await page.getByLabel('وصف موجز للطلب').fill('طلب اختبار آلي. لا تنفّذ.');
    await labelInput('مساحة الجناح (مثال 6x6)').fill('6x6');
    await labelInput('اسم المعرض').fill('LEAP 2026');
    const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString().slice(0, 10);
    await labelInput('تاريخ المعرض').fill(futureDate);
    await labelSelect('عدد الطوابق').selectOption('1');
    await page.getByRole('button', { name: 'التالي' }).click();
    record('P1-client', 'PASS', 'wizard step 1', 'details filled');

    // Step 2 — Budget. The city select + budget FormFields also lack `name`.
    const labelInput2 = (txt) =>
      page.locator(`xpath=//label[normalize-space()=${JSON.stringify(txt)}]/following-sibling::input[1]`);
    const labelSelect2 = (txt) =>
      page.locator(`xpath=//label[normalize-space()=${JSON.stringify(txt)}]/following-sibling::select[1]`);
    await labelSelect2('مدينة المعرض / التسليم').selectOption('الرياض');
    await labelInput2('الحد الأدنى للميزانية (﷼)').fill('50000');
    await labelInput2('الحد الأعلى للميزانية (﷼)').fill('80000');
    const deadline = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString().slice(0, 16);
    await labelInput2('آخر موعد لاستقبال العروض').fill(deadline);
    await page.getByRole('button', { name: 'التالي' }).click();
    record('P1-client', 'PASS', 'wizard step 2', `budget=50k-80k, deadline=${deadline}`);

    // Step 3 — Review & publish
    const publishBtn = page.getByRole('button', { name: /^انشر الطلب$/ });
    await Promise.all([
      page.waitForURL(/\/dashboard\/rfqs\/[0-9a-f-]+$/i, { timeout: 15000 }),
      publishBtn.click(),
    ]);
    const finalUrl = page.url().replace(BASE, '');
    createdRfqId = finalUrl.match(/rfqs\/([0-9a-f-]+)/i)?.[1] || null;
    if (createdRfqId) {
      record('P1-client', 'PASS', 'publish RFQ', `rfqId=${createdRfqId}, landed=${finalUrl}`);
    } else {
      record('P1-client', 'FAIL', 'publish RFQ', `landed=${finalUrl}, no rfqId in URL`);
    }

    // Verify RFQ row in DB
    if (createdRfqId) {
      const { data: row } = await admin
        .from('rfqs')
        .select('id, title, status, service_type')
        .eq('id', createdRfqId)
        .single();
      if (row?.status === 'open') {
        record('P1-client', 'PASS', 'DB check RFQ published', `status=${row.status}, service=${row.service_type}`);
      } else {
        record('P1-client', 'FAIL', 'DB check RFQ published', `status=${row?.status ?? 'NOT FOUND'}`);
      }
    }

    // RFQ detail page renders
    if (createdRfqId) {
      await visit(page, 'P1-client', 'RFQ detail', `/ar/dashboard/rfqs/${createdRfqId}`);
    }

    await ctx.close();
  }

  // ============================================================
  //  PHASE 2 — Supplier submits proposal
  // ============================================================
  console.log('\n━━━ PHASE 2: Supplier (محمد) — submit proposal ━━━');
  if (!createdRfqId) {
    record('P2-supplier', 'SKIP', 'phase skipped', 'no RFQ created in P1');
  } else {
    const ctx = await browser.newContext({ locale: 'ar-SA' });
    const page = await ctx.newPage();
    pageError(page, 'P2-supplier');

    await login(page, 'supplier', 'P2-supplier');

    // Sidebar / pages
    for (const [label, path] of [
      ['Supplier root → rfqs', '/ar/supplier'],
      ['Supplier RFQs list', '/ar/supplier/rfqs'],
      ['Supplier pending page', '/ar/supplier/pending'],
    ]) {
      await visit(page, 'P2-supplier', label, path);
    }

    // 4 dead sidebar links
    for (const [label, path] of [
      ['BROKEN: proposals', '/ar/supplier/proposals'],
      ['BROKEN: projects', '/ar/supplier/projects'],
      ['BROKEN: earnings', '/ar/supplier/earnings'],
      ['BROKEN: portfolio', '/ar/supplier/profile/portfolio'],
    ]) {
      const res = await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
      const status = res?.status() ?? 0;
      if (status === 404) record('P2-supplier', 'FAIL', label, `${path} → 404 (expected, page missing)`);
      else record('P2-supplier', 'PASS', label, `${path} → ${status}`);
    }

    // Navigate to the RFQ created in P1 and submit a proposal
    await page.goto(`${BASE}/ar/supplier/rfqs/${createdRfqId}`);
    const proposalLink = page.getByRole('link', { name: /قدّم عرضك/ });
    if (await proposalLink.count()) {
      await proposalLink.first().click();
      await page.waitForURL(/\/supplier\/rfqs\/[0-9a-f-]+\/proposal$/i, { timeout: 5000 });
      record('P2-supplier', 'PASS', 'click قدّم عرضك', page.url().replace(BASE, ''));
    } else {
      record('P2-supplier', 'FAIL', 'click قدّم عرضك', 'button not found');
    }

    // Fill + submit the proposal form
    if (page.url().endsWith('/proposal')) {
      await page.fill('input[name="totalPrice"]', '70000');
      await page.fill('input[name="deliveryDays"]', '45');
      await page.fill(
        'textarea[name="description"]',
        'عرض اختبار آلي لتصميم وتنفيذ جناح ٦×٦ بمواصفات أساسية. يشمل التصميم والتنفيذ والإشراف الميداني.'
      );
      await page.fill(
        'textarea[name="scopeOfWork"]',
        'نطاق العمل: ١) تصميم ٢د و ٣د للجناح. ٢) تنفيذ الهيكل والإنارة. ٣) برندنغ وطباعة. ٤) شاشة عرض ٥٥ بوصة. ٥) ركن استقبال وطاولتي اجتماع. ٦) فك وتركيب يومي. ٧) إشراف طوال أيام المعرض.'
      );
      await page.fill('input[name="paymentTerms"]', '50% مقدماً، 25% عند التركيب، 25% بعد التسليم');
      await Promise.all([
        page.waitForURL(/\/supplier\/rfqs\/[0-9a-f-]+$/i, { timeout: 15000 }),
        page.click('button[type="submit"]'),
      ]);
      record('P2-supplier', 'PASS', 'submit proposal', `landed=${page.url().replace(BASE, '')}`);

      // DB verify
      const { data: prop } = await admin
        .from('proposals')
        .select('id, rfq_id, supplier_id, total_price, status')
        .eq('rfq_id', createdRfqId)
        .single();
      if (prop) {
        createdProposalId = prop.id;
        record('P2-supplier', 'PASS', 'DB check proposal', `id=${prop.id.slice(0, 8)}…, status=${prop.status}, price=${prop.total_price}`);
      } else {
        record('P2-supplier', 'FAIL', 'DB check proposal', 'no row in proposals');
      }
    }

    await ctx.close();
  }

  // ============================================================
  //  PHASE 3 — Client awards + submits understanding
  // ============================================================
  console.log('\n━━━ PHASE 3: Client (أحمد) — compare, award, agreement ━━━');
  if (!createdRfqId || !createdProposalId) {
    record('P3-client', 'SKIP', 'phase skipped', 'missing RFQ or proposal from P1/P2');
  } else {
    const ctx = await browser.newContext({ locale: 'ar-SA' });
    const page = await ctx.newPage();
    pageError(page, 'P3-client');

    await login(page, 'client', 'P3-client');

    // RFQ detail → compare
    await visit(page, 'P3-client', 'RFQ detail (post-proposal)', `/ar/dashboard/rfqs/${createdRfqId}`);

    const compareLink = page.getByRole('link', { name: /عرض ومقارنة العروض/ });
    if (await compareLink.count()) {
      await compareLink.first().click();
      await page.waitForURL(/\/compare$/, { timeout: 5000 });
      record('P3-client', 'PASS', 'open compare page', page.url().replace(BASE, ''));
    } else {
      await visit(page, 'P3-client', 'fallback open compare', `/ar/dashboard/rfqs/${createdRfqId}/compare`);
    }

    // Award flow
    const awardBtn = page.getByRole('button', { name: /اختر هذا العرض/ });
    if (await awardBtn.count()) {
      await awardBtn.first().click();
      const confirmBtn = page.getByRole('button', { name: /تأكيد الاختيار/ });
      await Promise.all([
        page.waitForURL(/\/agreement$/, { timeout: 15000 }),
        confirmBtn.click(),
      ]);
      record('P3-client', 'PASS', 'award proposal', page.url().replace(BASE, ''));
    } else {
      record('P3-client', 'FAIL', 'award proposal', 'اختر هذا العرض button not visible');
    }

    // Submit understanding
    if (page.url().endsWith('/agreement')) {
      const understanding = page.locator('textarea[name="understanding"]');
      if (await understanding.count()) {
        await understanding.fill(
          'أفهم المشروع: تصميم وتنفيذ جناح ٦×٦ في معرض LEAP ٢٠٢٦. التسليم خلال ٤٥ يوماً من توقيع الاتفاق. الدفع ٥٠٪ مقدماً ثم ٢٥٪ عند التركيب ثم ٢٥٪ بعد التسليم.'
        );
        const submitBtn = page.getByRole('button', { name: /^أرسل فهمي$/ });
        await submitBtn.click();
        await page.waitForTimeout(1500); // server action + revalidate
        record('P3-client', 'PASS', 'submit understanding', 'client understanding saved');

        // DB verify
        const { data: ag } = await admin
          .from('agreements')
          .select('id, rfq_id, client_submitted_at, status')
          .eq('rfq_id', createdRfqId)
          .single();
        if (ag?.client_submitted_at) {
          record('P3-client', 'PASS', 'DB check understanding', `submitted_at=${ag.client_submitted_at.slice(0, 19)}`);
        } else {
          record('P3-client', 'FAIL', 'DB check understanding', 'client_submitted_at is null');
        }
      } else {
        record('P3-client', 'FAIL', 'submit understanding', 'understanding textarea not found');
      }
    }

    // Dead sidebar link
    const res = await page.goto(`${BASE}/ar/dashboard/settings/profile`, { waitUntil: 'domcontentloaded' });
    const status = res?.status() ?? 0;
    if (status === 200 && (await page.locator('body').innerText()).includes('404')) {
      record('P3-client', 'FAIL', 'BROKEN: settings/profile', '/ar/dashboard/settings/profile renders 404 page');
    } else if (status === 404) {
      record('P3-client', 'FAIL', 'BROKEN: settings/profile', '/ar/dashboard/settings/profile → 404');
    } else {
      record('P3-client', 'PASS', 'settings/profile', `${status} (${page.url().replace(BASE, '')})`);
    }

    await ctx.close();
  }

  // ============================================================
  //  PHASE 4 — Admin sweep
  // ============================================================
  console.log('\n━━━ PHASE 4: Admin (سارة) — admin pages ━━━');
  {
    const ctx = await browser.newContext({ locale: 'ar-SA' });
    const page = await ctx.newPage();
    pageError(page, 'P4-admin');

    await login(page, 'admin', 'P4-admin');

    for (const [label, path] of [
      ['Admin home', '/admin'],
      ['Suppliers pending', '/admin/suppliers/pending'],
      ['Escrow pending deposits', '/admin/escrow/pending-deposits'],
    ]) {
      await visit(page, 'P4-admin', label, path);
    }

    // 3 dead sidebar links
    for (const [label, path] of [
      ['BROKEN: admin RFQs', '/admin/rfqs'],
      ['BROKEN: admin chats', '/admin/chats'],
      ['BROKEN: admin disputes', '/admin/disputes'],
    ]) {
      const res = await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
      const status = res?.status() ?? 0;
      if (status === 404) record('P4-admin', 'FAIL', label, `${path} → 404 (expected, page missing)`);
      else record('P4-admin', 'PASS', label, `${path} → ${status}`);
    }

    await ctx.close();
  }
} finally {
  await browser.close();
}

// ============================================================
//  REPORT
// ============================================================
console.log('\n━━━ SUMMARY ━━━');
const byPhase = {};
const counts = { PASS: 0, FAIL: 0, SKIP: 0, INFO: 0 };
for (const f of findings) {
  byPhase[f.phase] ??= { PASS: 0, FAIL: 0, SKIP: 0, INFO: 0 };
  byPhase[f.phase][f.level] = (byPhase[f.phase][f.level] || 0) + 1;
  counts[f.level] = (counts[f.level] || 0) + 1;
}
for (const phase of Object.keys(byPhase).sort()) {
  console.log(`  ${phase}:`, byPhase[phase]);
}
console.log('  TOTAL:', counts);

const reportPath = '/tmp/action-findings.json';
writeFileSync(
  reportPath,
  JSON.stringify({ runId: RUN_ID, base: BASE, createdRfqId, createdProposalId, findings }, null, 2)
);
console.log(`\nFindings written to ${reportPath}`);

process.exit(counts.FAIL > 0 ? 1 : 0);
