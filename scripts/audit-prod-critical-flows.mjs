// Re-verify the critical flows against the production build.
// Login, RFQ creation, chat, escrow + bonus: render-time comparison vs dev.

import { fetchPage, getCookieFor, adminSb } from './lib-audit-helpers.mjs';
import { readFileSync } from 'node:fs';

const items = [];
function rec(num, item, ok, detail = '') {
  items.push({ num, item, ok, detail });
  console.log(`  ${ok ? '✅' : '❌'} ${num} — ${item}${detail ? '  ['+detail+']' : ''}`);
}

async function bench(label, path, cookie) {
  // 2 warm, 3 timed
  for (let i = 0; i < 2; i++) await fetchPage(path, cookie);
  let total = 0;
  for (let i = 0; i < 3; i++) {
    const t0 = performance.now();
    await fetchPage(path, cookie);
    total += performance.now() - t0;
  }
  const avg = Math.round(total / 3);
  return avg;
}

// === A. Login + auth landings ===
console.log('--- A. Login + landings ---');
const lR = await fetchPage('/ar/login', null);
rec('A.1', '/ar/login → 200', lR.status === 200);
rec('A.2', 'login H1 "سجّل دخولك"', lR.html.includes('سجّل دخولك'));
// Auth pages use their own slim chrome (logo + locale toggle) — SiteHeader's
// aria-label='تطبيق المعارض' only renders on marketing pages. Check /ar (home).
const hR = await fetchPage('/ar', null);
rec('A.3', '/ar home header has aria-label="تطبيق المعارض" (a11y fix from Phase 3)',
  hR.html.includes('aria-label="تطبيق المعارض"'));

// PROD SSR should have lang+dir on the outer <html> tag
rec('A.4', '/ar/login outer <html lang="ar" dir="rtl"> (prod SSR)',
  /<html[^>]*lang="ar"[^>]*dir="rtl"|<html[^>]*dir="rtl"[^>]*lang="ar"/.test(lR.html));

// 404 page: inline-rendered via the [locale]/[...rest] catch-all to preserve
// the locale layout's <html lang dir>. Returns status 200 by design (Next.js
// 16's notFound() would give 404 status but strip the layout — accepted
// trade-off, documented in scripts/audit-prod-critical-flows.mjs).
const nfR = await fetchPage('/ar/this-does-not-exist-xyz', null);
rec('A.5', 'PROD 404 page renders (status 200, inline by design)', nfR.status === 200);
rec('A.6', 'PROD 404 has Arabic body "غير موجودة"', nfR.html.includes('غير موجودة') || nfR.html.includes('لم نعثر'));
rec('A.7', 'PROD 404 outer <html lang="ar" dir="rtl">',
  /<html[^>]*lang="ar"[^>]*dir="rtl"|<html[^>]*dir="rtl"[^>]*lang="ar"/.test(nfR.html));

// Authenticated landings
const clientCookie = await getCookieFor('client');
const supplierCookie = await getCookieFor('supplier');
const adminCookie = await getCookieFor('admin');
{
  const r = await fetchPage('/ar/dashboard', clientCookie);
  rec('A.8', 'Client → /ar/dashboard → 200 + H1 "أهلاً بك"', r.status === 200 && r.html.includes('أهلاً بك'));
}
{
  const r = await fetchPage('/admin', adminCookie);
  rec('A.9', 'Admin → /admin → 200 + H1 "نظرة عامة"', r.status === 200 && r.html.includes('نظرة عامة'));
}
{
  const r = await fetchPage('/ar/supplier/rfqs', supplierCookie);
  rec('A.10', 'Supplier → /supplier/rfqs → 200 + H1 "الطلبات المتاحة"', r.status === 200 && r.html.includes('الطلبات المتاحة'));
}

// === B. RFQ list + detail + wizard ===
console.log('\n--- B. RFQ flows ---');
const rlR = await fetchPage('/ar/dashboard/rfqs', clientCookie);
rec('B.1', 'RFQ list → 200 + shows 3 RFQs', rlR.status === 200 && rlR.html.includes('RFQ-2026-00001') && rlR.html.includes('RFQ-2026-00003') && rlR.html.includes('RFQ-2026-00004'));
const rdR = await fetchPage('/ar/dashboard/rfqs/06d8e776-aae9-4721-8ab5-5772dd3df464', clientCookie);
rec('B.2', 'RFQ detail → 200 + status pill مكتمل', rdR.status === 200 && rdR.html.includes('مكتمل'));
const rwR = await fetchPage('/ar/dashboard/rfqs/new', clientCookie);
rec('B.3', 'RFQ wizard → 200 + 5 steps + 4 service-type cards',
  rwR.status === 200 && rwR.html.includes('طلب عرض جديد') &&
  rwR.html.includes('الخدمة') && rwR.html.includes('التفاصيل') && rwR.html.includes('الميزانية') && rwR.html.includes('الملفات') && rwR.html.includes('مراجعة') &&
  rwR.html.includes('تصميم وتنفيذ أجنحة') && rwR.html.includes('هدايا ترويجية') && rwR.html.includes('تنظيم فعاليات') && rwR.html.includes('مطبوعات'));
const cmpR = await fetchPage('/ar/dashboard/rfqs/06d8e776-aae9-4721-8ab5-5772dd3df464/compare', clientCookie);
rec('B.4', 'Compare page → 200', cmpR.status === 200);

// === C. Chat flows ===
console.log('\n--- C. Chat flows ---');
const cR = await fetchPage('/ar/dashboard/rfqs/06d8e776-aae9-4721-8ab5-5772dd3df464/chats/de405783-01b7-44cb-ac79-ad5c75c02d14', clientCookie);
rec('C.1', 'Client chat detail → 200 + panic banner', cR.status === 200 && (cR.html.includes('🚨') || cR.html.includes('تصعيد')));
const scR = await fetchPage('/ar/supplier/chats/de405783-01b7-44cb-ac79-ad5c75c02d14', supplierCookie);
rec('C.2', 'Supplier chat detail → 200', scR.status === 200);
const acR = await fetchPage('/admin/chats/de405783-01b7-44cb-ac79-ad5c75c02d14', adminCookie);
rec('C.3', 'Admin chat detail → 200 + admin-joined badge', acR.status === 200 && acR.html.includes('انضمت لهذه المحادثة'));
// DB-state regression for chat (4-cap proven still)
const { count: chatCount } = await adminSb.from('chats').select('id', { count: 'exact', head: true }).eq('rfq_id', '06d8e776-aae9-4721-8ab5-5772dd3df464');
rec('C.4', '4-chat cap stable in DB (still 4 chats)', chatCount === 4);

// === D. Escrow flows ===
console.log('\n--- D. Escrow flows ---');
const eR = await fetchPage('/ar/dashboard/rfqs/06d8e776-aae9-4721-8ab5-5772dd3df464/escrow', clientCookie);
rec('D.1', 'Client escrow → 200 + H1 "إيصال الدفع"', eR.status === 200 && eR.html.includes('إيصال الدفع'));
rec('D.2', 'Escrow shows 4 amount cards', eR.html.includes('إجمالي الاتفاق') && eR.html.includes('الإيداع المبدئي') && eR.html.includes('الدفعة النهائية') && eR.html.includes('الحالة'));
rec('D.3', 'Escrow shows supplier bank details + IBAN', eR.html.includes('بيانات المورد البنكية') && eR.html.includes('IBAN'));
rec('D.4', 'Escrow status reads "مكتمل"', eR.html.includes('مكتمل'));
rec('D.5', 'Escrow shows 66,495 ﷼ total', eR.html.includes('66,495'));

const adR = await fetchPage('/admin/escrow/transactions', adminCookie);
rec('D.6', 'Admin escrow transactions → 200', adR.status === 200);
rec('D.7', 'Admin escrow shows GMV 66,495 ﷼ + platform revenue', adR.html.includes('66,495') && adR.html.includes('إيراد المنصة'));

// === E. PROD render-time benchmark vs DEV ===
console.log('\n--- E. PROD render-time (warm) ---');
const benches = [
  ['/ar (public home)', null],
  ['/ar/dashboard', clientCookie],
  ['/ar/supplier/rfqs', supplierCookie],
  ['/ar/supplier/proposals', supplierCookie],
  ['/ar/supplier/projects', supplierCookie],
  ['/ar/supplier/earnings', supplierCookie],
  ['/admin', adminCookie],
  ['/admin/users', adminCookie],
  ['/admin/escrow/transactions', adminCookie],
  ['/admin/activity', adminCookie],
];
const benchResults = {};
for (const [label, cookie] of benches) {
  const avg = await bench(label, label.replace(/ \(.*\)/, ''), cookie);
  benchResults[label] = avg;
  const flag = avg < 100 ? '🚀' : avg < 250 ? '✅' : avg < 500 ? '⚠️ ' : '🐢';
  console.log(`  ${flag}  ${String(avg).padStart(4)}ms  ${label}`);
}

// === F. Cross-role guards (regression) ===
console.log('\n--- F. Cross-role guards regression ---');
async function checkRedirect(label, path, cookie, expectedTarget) {
  const r = await fetchPage(path, cookie);
  return (r.status === 307 || r.status === 303) && (r.location ?? '').includes(expectedTarget);
}
rec('F.1', 'client → /admin → /ar/dashboard', await checkRedirect('', '/admin', clientCookie, '/ar/dashboard'));
rec('F.2', 'supplier → /admin → /ar/supplier', await checkRedirect('', '/admin', supplierCookie, '/ar/supplier'));
rec('F.3', 'admin → /ar/dashboard → /admin', await checkRedirect('', '/ar/dashboard', adminCookie, '/admin'));
rec('F.4', 'unauth → /ar/dashboard → /login', await checkRedirect('', '/ar/dashboard', null, '/login'));

const okc = items.filter(i => i.ok).length;
console.log(`\n=== PROD critical flows: ${okc}/${items.length} ===`);

// Render-time summary
const avgs = Object.values(benchResults);
const median = avgs.sort((a,b)=>a-b)[Math.floor(avgs.length/2)];
const max = Math.max(...avgs);
console.log(`\nBenchmark summary: median=${median}ms, max=${max}ms across ${avgs.length} routes`);

process.exit(okc === items.length ? 0 : 1);
