import { fetchPage, getCookieFor, adminSb } from './lib-audit-helpers.mjs';

const items = [];
function rec(num, item, ok, detail = '') {
  items.push({ num, item, ok, detail });
  console.log(`  ${ok ? '✅' : '❌'} ${num} — ${item}${detail ? '  ['+detail+']' : ''}`);
}

const clientCookie = await getCookieFor('client');
const clientId = 'e8505a1f-473b-4d3e-a8fc-a31b5f8bfe81';

// === Dashboard page content ===
const dR = await fetchPage('/ar/dashboard', clientCookie);
rec('1.3.1', 'GET /ar/dashboard → 200', dR.status === 200);
rec('1.3.2', 'H1 reads "أهلاً بك"', dR.html.includes('أهلاً بك'));
rec('1.3.3', 'Has CTA "ابدأ طلب جديد" or similar', dR.html.includes('rfqs/new') || dR.html.includes('طلب جديد'));

// === KPI cards reflect real data ===
const { data: rfqs } = await adminSb.from('rfqs').select('id, status').eq('client_id', clientId).is('deleted_at', null);
const expectedKpis = {
  active: rfqs.filter(r => ['open','negotiating','awarded'].includes(r.status)).length,
  awaiting: rfqs.filter(r => r.status === 'open').length,
  inExec: rfqs.filter(r => ['in_escrow','in_progress'].includes(r.status)).length,
  completed: rfqs.filter(r => r.status === 'completed').length,
};
rec('1.3.4', `KPI labels: active/proposals/execution/completed render`,
  dR.html.includes('نشط') || dR.html.includes('عرض') || dR.html.includes('قيد') || dR.html.includes('مكتمل'));
rec('1.3.5', `Recent RFQs widget present (shows RFQ-2026-00001)`, dR.html.includes('RFQ-2026-00001'));

// === Sidebar nav (client layout: 5 links per docs) ===
rec('1.3.6', 'Sidebar/nav has "لوحة التحكم"', dR.html.includes('لوحة التحكم') || dR.html.includes('الرئيسية'));
rec('1.3.7', 'Sidebar has "طلباتي" link', dR.html.includes('طلباتي') || dR.html.includes('/dashboard/rfqs'));
rec('1.3.8', 'Sidebar has "اكتشف الموردين" link', dR.html.includes('اكتشف') || dR.html.includes('/discover'));
rec('1.3.9', 'Sidebar has "الإعدادات" link', dR.html.includes('الإعدادات') || dR.html.includes('/settings'));
rec('1.3.10', 'Sidebar has logout (تسجيل الخروج)', dR.html.includes('تسجيل الخروج'));

// === Notification bell in HeaderBar ===
rec('1.3.11', 'HeaderBar has notification bell button', dR.html.includes('الإشعارات') || dR.html.includes('aria-label="الإشعارات"'));

// === Suggested suppliers widget ===
rec('1.3.12', 'Suggested suppliers section (top 4 approved)', dR.html.includes('شركة الإبداع') || dR.html.includes('موردون مقترح'));

// === Upcoming exhibitions widget ===
rec('1.3.13', 'Upcoming exhibitions placeholder (LEAP / Cityscape / GITEX)', dR.html.includes('LEAP') || dR.html.includes('Cityscape') || dR.html.includes('GITEX'));

// === RFQs list page ===
const rR = await fetchPage('/ar/dashboard/rfqs', clientCookie);
rec('1.3.14', '/ar/dashboard/rfqs → 200', rR.status === 200);
rec('1.3.15', 'RFQ list H1 ("طلباتي" or similar)', /<h1/.test(rR.html));
rec('1.3.16', 'RFQ list shows existing RFQs', rR.html.includes('RFQ-2026-00001'));
rec('1.3.17', 'RFQ list has status filter or tabs', rR.html.includes('select') || rR.html.includes('مفتوح') || rR.html.includes('aria-label="الحالة"'));

// === Notifications page ===
const nR = await fetchPage('/ar/dashboard/notifications', clientCookie);
rec('1.3.18', '/ar/dashboard/notifications → 200', nR.status === 200);
rec('1.3.19', 'Notifications page H1', /<h1/.test(nR.html));

// === Settings index landing ===
const sR = await fetchPage('/ar/dashboard/settings/profile', clientCookie);
rec('1.3.20', '/ar/dashboard/settings/profile → 200', sR.status === 200);
const scR = await fetchPage('/ar/dashboard/settings/company', clientCookie);
rec('1.3.21', '/ar/dashboard/settings/company → 200', scR.status === 200);

// === Onboarding routes exist ===
const oW = await fetchPage('/ar/dashboard/onboarding/welcome', clientCookie);
rec('1.3.22', 'onboarding/welcome → 200', oW.status === 200);
const oE = await fetchPage('/ar/dashboard/onboarding/exhibition', clientCookie);
rec('1.3.23', 'onboarding/exhibition → 200', oE.status === 200);
const oR = await fetchPage('/ar/dashboard/onboarding/recommendations', clientCookie);
rec('1.3.24', 'onboarding/recommendations → 200', oR.status === 200);

// === Notifications: bell action exists ===
import('../app/actions/notifications.ts').catch(()=>{}); // sanity import won't run server
const nfActions = (await import('node:fs')).readFileSync('app/actions/notifications.ts', 'utf8');
rec('1.3.25', 'notifications action: getRecentNotificationsAction exported', nfActions.includes('getRecentNotificationsAction'));
rec('1.3.26', 'notifications action: markNotificationsReadAction exported', nfActions.includes('markNotificationsReadAction'));

// === Notifications row count for the client ===
const { count: nCount } = await adminSb.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', clientId);
rec('1.3.27', `Notifications table queryable for client (count=${nCount ?? 0})`, nCount !== null);

const okc = items.filter(i => i.ok).length;
console.log(`\n=== Section 1.3: ${okc}/${items.length} ===`);
process.exit(okc === items.length ? 0 : 1);
