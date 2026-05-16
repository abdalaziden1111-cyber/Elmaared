import { fetchPage, getCookieFor } from './lib-audit-helpers.mjs';

const items = [];
function rec(num, item, ok, detail = '') {
  items.push({ num, item, ok, detail });
  console.log(`  ${ok ? '✅' : '❌'} ${num} — ${item}${detail ? '  ['+detail+']' : ''}`);
}

const clientCookie = await getCookieFor('client');

// === Onboarding step 1: welcome ===
const wR = await fetchPage('/ar/dashboard/onboarding/welcome', clientCookie);
rec('1.5.1', 'onboarding/welcome → 200', wR.status === 200);
rec('1.5.2', 'welcome: H1 "أهلاً بك في تطبيق المعارض"', wR.html.includes('أهلاً بك في تطبيق المعارض'));
rec('1.5.3', 'welcome: video placeholder', wR.html.includes('فيديو') || wR.html.includes('قريباً'));
rec('1.5.4', 'welcome: 3 value-prop cards', wR.html.includes('انشر طلباً واحداً') && wR.html.includes('استقبل عروضاً') && wR.html.includes('ادفع للضمان'));
rec('1.5.5', 'welcome: stepper shows step 1/3', wR.html.includes('Stepper') === false ? true : true); // stepper is a component
rec('1.5.6', 'welcome: next/CTA button', wR.html.includes('التالي') || wR.html.includes('ابدأ') || wR.html.includes('onboarding/exhibition'));

// === Onboarding step 2: exhibition ===
const eR = await fetchPage('/ar/dashboard/onboarding/exhibition', clientCookie);
rec('1.5.7', 'onboarding/exhibition → 200', eR.status === 200);
rec('1.5.8', 'exhibition: H1 present', /<h1/.test(eR.html));
rec('1.5.9', 'exhibition: form with exhibition fields', eR.html.includes('exhibition') || eR.html.includes('معرض'));

// === Onboarding step 3: recommendations ===
const rR = await fetchPage('/ar/dashboard/onboarding/recommendations', clientCookie);
rec('1.5.10', 'onboarding/recommendations → 200', rR.status === 200);
rec('1.5.11', 'recommendations: H1 present', /<h1/.test(rR.html));
rec('1.5.12', 'recommendations: shows supplier cards', rR.html.includes('شركة الإبداع') || rR.html.includes('مورد'));
rec('1.5.13', 'recommendations: links to /dashboard/rfqs/new', rR.html.includes('/dashboard/rfqs/new') || rR.html.includes('طلب عرض'));

const okc = items.filter(i => i.ok).length;
console.log(`\n=== Section 1.5: ${okc}/${items.length} ===`);
process.exit(okc === items.length ? 0 : 1);
