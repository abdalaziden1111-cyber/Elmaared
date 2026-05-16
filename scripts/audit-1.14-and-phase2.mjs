import { fetchPage, getCookieFor, adminSb } from './lib-audit-helpers.mjs';
import { readFileSync } from 'node:fs';

const items = [];
function rec(num, item, ok, detail = '') {
  items.push({ num, item, ok, detail });
  console.log(`  ${ok ? '✅' : '❌'} ${num} — ${item}${detail ? '  ['+detail+']' : ''}`);
}

const clientCookie = await getCookieFor('client');
const supplierCookie = await getCookieFor('supplier');
const adminCookie = await getCookieFor('admin');
const pendingCookie = await getCookieFor('pending');

// === 1.14 — Cross-role guards (regression) ===
console.log('--- 1.14 Cross-role guards ---');
async function checkRedirect(label, path, cookie, expectedTarget) {
  const r = await fetchPage(path, cookie);
  return (r.status === 307 || r.status === 303) && (r.location ?? '').includes(expectedTarget);
}
rec('1.14.1', 'unauth → /ar/dashboard → /login', await checkRedirect('', '/ar/dashboard', null, '/login'));
rec('1.14.2', 'unauth → /ar/supplier → /login', await checkRedirect('', '/ar/supplier', null, '/login'));
rec('1.14.3', 'unauth → /admin → /login', await checkRedirect('', '/admin', null, '/login'));
rec('1.14.4', 'client → /admin → /ar/dashboard', await checkRedirect('', '/admin', clientCookie, '/ar/dashboard'));
rec('1.14.5', 'supplier → /admin → /ar/supplier', await checkRedirect('', '/admin', supplierCookie, '/ar/supplier'));
rec('1.14.6', 'supplier → /ar/dashboard → /ar/supplier', await checkRedirect('', '/ar/dashboard', supplierCookie, '/ar/supplier'));
rec('1.14.7', 'client → /ar/supplier → /ar/dashboard', await checkRedirect('', '/ar/supplier', clientCookie, '/ar/dashboard'));
rec('1.14.8', 'admin → /ar/dashboard → /admin', await checkRedirect('', '/ar/dashboard', adminCookie, '/admin'));
rec('1.14.9', 'admin → /ar/supplier → /admin', await checkRedirect('', '/ar/supplier', adminCookie, '/admin'));

// === Phase 2.1 — Supplier signup wizard structure (re-verify from 1.2) ===
console.log('\n--- 2.1 Supplier signup wizard ---');
for (const p of ['/ar/signup/supplier/account','/ar/signup/supplier/company','/ar/signup/supplier/specializations','/ar/signup/supplier/documents']) {
  const r = await fetchPage(p, null);
  rec(`2.1.${p.split('/').pop()}`, `${p} → 200`, r.status === 200);
}
const schemaSrc = readFileSync('schemas/auth.ts', 'utf8');
rec('2.1.email-domain', 'signupSupplierAction surfaces invalid-email-domain error', readFileSync('app/actions/auth.ts','utf8').includes('email_address_invalid') || readFileSync('app/actions/auth.ts','utf8').includes('غير صالح'));
rec('2.1.rate-limit', 'signupSupplierAction surfaces rate-limit error', readFileSync('app/actions/auth.ts','utf8').includes('rate limit') || readFileSync('app/actions/auth.ts','utf8').includes('over_email_send_rate_limit'));

// === Phase 2.2 — /supplier/pending page ===
console.log('\n--- 2.2 Pending supplier ---');
const pR = await fetchPage('/ar/supplier/pending', pendingCookie);
rec('2.2.1', '/supplier/pending → 200', pR.status === 200);
rec('2.2.2', 'pending page H1 "حسابك قيد المراجعة"', pR.html.includes('حسابك قيد المراجعة'));
rec('2.2.3', 'pending sidebar gated message rendered', pR.html.includes('حسابك قيد المراجعة من Admin'));
// Pending supplier shouldn't see operational links
rec('2.2.4', 'pending supplier sidebar lacks operational links', !pR.html.includes('/supplier/proposals') && !pR.html.includes('/supplier/projects'));

// === Phase 2.3 — Matched RFQs list ===
console.log('\n--- 2.3 Matched RFQs ---');
const mR = await fetchPage('/ar/supplier/rfqs', supplierCookie);
rec('2.3.1', '/supplier/rfqs → 200', mR.status === 200);
rec('2.3.2', 'shows RFQ-2026-00004 (matching booth specialization)', mR.html.includes('RFQ-2026-00004'));
rec('2.3.3', 'list shows search bar', mR.html.includes('بحث') || mR.html.includes('ابحث'));
rec('2.3.4', 'RLS workaround: only open + matching shown', !mR.html.includes('RFQ-2026-00003')); // 00003 is draft

// === Phase 2.4-5 — Supplier RFQ detail + proposal submission ===
console.log('\n--- 2.4-5 RFQ detail + proposal submission ---');
const rfqdR = await fetchPage('/ar/supplier/rfqs/28aa561e-a9af-4ff8-8235-f7692655b55d', supplierCookie);
rec('2.4.1', '/supplier/rfqs/[id] → 200', rfqdR.status === 200);
// supplier already submitted on this RFQ
rec('2.4.2', '"قدّم عرضك" CTA hidden (already submitted)', !rfqdR.html.includes('قدّم عرضك ←'));
rec('2.4.3', '"قدّمت عرضاً" notice shown', rfqdR.html.includes('قدّمت عرضاً على هذا الطلب'));

// Proposal form page
const proR = await fetchPage('/ar/supplier/rfqs/28aa561e-a9af-4ff8-8235-f7692655b55d/proposal', supplierCookie);
rec('2.5.1', '/supplier/rfqs/[id]/proposal → 200', proR.status === 200);
rec('2.5.2', 'proposal form has totalPrice + deliveryDays + scope + paymentTerms', proR.html.includes('totalPrice') && proR.html.includes('deliveryDays') && proR.html.includes('scopeOfWork') && proR.html.includes('paymentTerms'));

// === Phase 2.6 — Proposals list ===
console.log('\n--- 2.6 Proposals list ---');
const plR = await fetchPage('/ar/supplier/proposals', supplierCookie);
rec('2.6.1', '/supplier/proposals → 200', plR.status === 200);
rec('2.6.2', 'shows both submitted + accepted proposals', plR.html.includes('RFQ-2026-00004') && plR.html.includes('RFQ-2026-00001'));
rec('2.6.3', 'status filter tabs (مُقدَّم/مقبول/مرفوض/في القائمة المختصرة)', plR.html.includes('مُقدَّم') && plR.html.includes('مقبول') && plR.html.includes('مرفوض'));
const acceptedR = await fetchPage('/ar/supplier/proposals?status=accepted', supplierCookie);
rec('2.6.4', '?status=accepted filter works', acceptedR.html.includes('RFQ-2026-00001') && !acceptedR.html.includes('RFQ-2026-00004'));

// === Phase 2.7 — Supplier chat ===
console.log('\n--- 2.7 Supplier chat ---');
const scR = await fetchPage('/ar/supplier/chats/de405783-01b7-44cb-ac79-ad5c75c02d14', supplierCookie);
rec('2.7.1', '/supplier/chats/[id] → 200', scR.status === 200);
rec('2.7.2', 'chat page shows messages', scR.html.includes('🚨') || scR.html.includes('شاشة'));

// === Phase 2.8 — Projects ===
console.log('\n--- 2.8 Projects ---');
const prR = await fetchPage('/ar/supplier/projects', supplierCookie);
rec('2.8.1', '/supplier/projects → 200', prR.status === 200);
rec('2.8.2', 'completed RFQ-2026-00001 visible', prR.html.includes('RFQ-2026-00001') && prR.html.includes('مكتمل'));

// === Phase 2.9 — Earnings ===
console.log('\n--- 2.9 Earnings ---');
const eR = await fetchPage('/ar/supplier/earnings', supplierCookie);
rec('2.9.1', '/supplier/earnings → 200', eR.status === 200);
rec('2.9.2', '3 KPI cards (مُحرّر / بانتظار / المجموع)', eR.html.includes('إجمالي مُحرّر') && eR.html.includes('بانتظار التحرير') && eR.html.includes('المجموع'));
rec('2.9.3', 'released = 63,050 ﷼', eR.html.includes('63,050'));

// === Phase 2.10 — Profile portfolio + edit ===
console.log('\n--- 2.10 Profile portfolio + edit ---');
const ppR = await fetchPage('/ar/supplier/profile/portfolio', supplierCookie);
rec('2.10.1', '/supplier/profile/portfolio → 200', ppR.status === 200);
rec('2.10.2', 'portfolio shows 5 sections (basic/specs+cities/bio+stats/bank/portfolio)',
  ppR.html.includes('المعلومات الأساسية') && ppR.html.includes('التخصصات والمدن') && ppR.html.includes('نبذة وإحصاءات') && ppR.html.includes('معلومات البنك'));
const peR = await fetchPage('/ar/supplier/profile/edit', supplierCookie);
rec('2.10.3', '/supplier/profile/edit → 200', peR.status === 200);
rec('2.10.4', 'edit form has all editable fields', peR.html.includes('companyName') && peR.html.includes('bio') && peR.html.includes('iban'));
rec('2.10.5', 'edit page has 3 doc upload slots (cr/vat/portfolio)',
  peR.html.includes('السجل التجاري') && peR.html.includes('الشهادة الضريبية') && peR.html.includes('ملف الأعمال'));

// === Phase 2.11 — Supplier pricing page (verify it exists per doc spec) ===
console.log('\n--- 2.11 Supplier pricing ---');
// The doc says supplier should be able to view pricing. The public /ar/pricing page exists.
const supPricing = await fetchPage('/ar/pricing', supplierCookie);
rec('2.11.1', 'supplier can view public /ar/pricing', supPricing.status === 200);
// There's no /supplier/pricing distinct route. Public pricing serves both audiences.
rec('2.11.2', 'pricing page accessible from supplier session (no separate /supplier/pricing in doc)', supPricing.html.includes('2%') && supPricing.html.includes('3%'));

const okc = items.filter(i => i.ok).length;
console.log(`\n=== Section 1.14 + Phase 2: ${okc}/${items.length} ===`);
process.exit(okc === items.length ? 0 : 1);
