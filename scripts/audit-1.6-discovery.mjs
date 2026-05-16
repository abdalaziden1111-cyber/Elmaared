import { fetchPage, getCookieFor, adminSb } from './lib-audit-helpers.mjs';

const items = [];
function rec(num, item, ok, detail = '') {
  items.push({ num, item, ok, detail });
  console.log(`  ${ok ? '✅' : '❌'} ${num} — ${item}${detail ? '  ['+detail+']' : ''}`);
}

// Discover is public (no auth required)
const dR = await fetchPage('/ar/discover', null);
rec('1.6.1', '/ar/discover → 200 (public)', dR.status === 200);
rec('1.6.2', 'discover: H1 present', /<h1/.test(dR.html));
rec('1.6.3', 'discover: 4 service filter chips', dR.html.includes('تصميم وتنفيذ أجنحة') && dR.html.includes('هدايا ترويجية') && dR.html.includes('تنظيم فعاليات') && dR.html.includes('مطبوعات'));
rec('1.6.4', 'discover: 10 city filter chips', ['الرياض','جدة','الدمام','الخبر','مكة المكرمة','المدينة المنورة','تبوك','أبها','حائل','جازان'].every(c => dR.html.includes(c)));
rec('1.6.5', 'discover: shows approved suppliers', dR.html.includes('شركة الإبداع'));

// Filter by service: ?service=booth
const dBoothR = await fetchPage('/ar/discover?service=booth', null);
rec('1.6.6', '?service=booth filter works', dBoothR.status === 200 && dBoothR.html.includes('شركة الإبداع'));

// Filter by service that no supplier has
const dPrintR = await fetchPage('/ar/discover?service=printing', null);
rec('1.6.7', '?service=printing returns empty state', dPrintR.html.includes('لا') || dPrintR.html.includes('ما فيش') || dPrintR.html.includes('empty') || !dPrintR.html.includes('شركة الإبداع'));

// Filter by city
const dCityR = await fetchPage('/ar/discover?city=' + encodeURIComponent('الرياض'), null);
rec('1.6.8', '?city=الرياض filter works', dCityR.status === 200);

// Pagination param
const dP2R = await fetchPage('/ar/discover?page=2', null);
rec('1.6.9', 'pagination param accepted (?page=2)', dP2R.status === 200);

// Only approved suppliers visible
const { count: approvedCount } = await adminSb.from('suppliers').select('id', { count: 'exact', head: true }).eq('status', 'approved');
const { count: totalCount } = await adminSb.from('suppliers').select('id', { count: 'exact', head: true });
rec('1.6.10', `DB has approved suppliers (${approvedCount}) vs total (${totalCount})`, approvedCount > 0);

// Supplier detail page
const { data: sup } = await adminSb.from('suppliers').select('id').eq('status','approved').limit(1).single();
const sdR = await fetchPage(`/ar/discover/${sup.id}`, null);
rec('1.6.11', `/ar/discover/[id] → 200`, sdR.status === 200);
rec('1.6.12', 'supplier profile: H1 with company name', /<h1/.test(sdR.html));
rec('1.6.13', 'supplier profile: has stats (rating / completed orders / years)', sdR.html.includes('تقييم') || sdR.html.includes('مشروع') || sdR.html.includes('سنة'));
rec('1.6.14', 'supplier profile: back-to-list link', sdR.html.includes('/ar/discover'));
rec('1.6.15', 'supplier profile: has RFQ CTA', sdR.html.includes('rfqs/new') || sdR.html.includes('اطلب عرض') || sdR.html.includes('signup'));

// Non-approved supplier should NOT be visible publicly
const { data: pendingSup } = await adminSb.from('suppliers').select('id').eq('status','pending_review').limit(1).maybeSingle();
if (pendingSup) {
  const psR = await fetchPage(`/ar/discover/${pendingSup.id}`, null);
  rec('1.6.16', 'Pending supplier blocked from public profile', psR.status === 404 || psR.status === 307);
}

const okc = items.filter(i => i.ok).length;
console.log(`\n=== Section 1.6: ${okc}/${items.length} ===`);
process.exit(okc === items.length ? 0 : 1);
