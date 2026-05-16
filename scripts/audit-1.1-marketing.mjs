// Deep audit Section 1.1 — Marketing surface (21 routes).
// Tests every header link, footer link, locale toggle, CTA, 404, redirects.

import { fetchPage } from './lib-audit-helpers.mjs';

const items = [];
function rec(num, item, ok, detail = '') {
  items.push({ num, item, ok, detail });
  console.log(`  ${ok ? '✅' : '❌'} ${num} — ${item}${detail ? '  ['+detail+']' : ''}`);
}

// --- 1.1.0 Bare / → 307 to /ar ---
{
  const r = await fetchPage('/', null);
  rec('1.1.0', 'GET /', r.status === 307 && r.location === '/ar', `status=${r.status} loc=${r.location}`);
}

// --- 1.1.1 .. 1.1.21 Each marketing route (ar + en) returns 200 ---
const ROUTES = [
  '/ar', '/en',
  '/ar/how-it-works', '/en/how-it-works',
  '/ar/for-clients', '/en/for-clients',
  '/ar/for-suppliers', '/en/for-suppliers',
  '/ar/pricing', '/en/pricing',
  '/ar/about', '/en/about',
  '/ar/contact', '/en/contact',
  '/ar/suppliers', '/en/suppliers',
  '/ar/exhibitions', '/en/exhibitions',
  '/ar/blog', '/en/blog',
  '/ar/legal/terms', '/en/legal/terms',
  '/ar/legal/privacy', '/en/legal/privacy',
];
const BLOG_SLUGS = [
  'how-to-pick-a-booth-contractor', 'escrow-vs-direct-payment',
  'ai-evaluation-criteria', 'panic-button-when-to-use', 'planning-your-first-leap',
];
let n = 0;
for (const route of ROUTES) {
  n++;
  const r = await fetchPage(route, null);
  rec(`1.1.${n}`, `GET ${route}`, r.status === 200, `status=${r.status}`);
}
for (const slug of BLOG_SLUGS) {
  n++;
  const r = await fetchPage(`/ar/blog/${slug}`, null);
  rec(`1.1.${n}`, `GET /ar/blog/${slug}`, r.status === 200, `status=${r.status}`);
}

// --- 1.1.X Header chrome (logo + aria-label + locale toggle + login + signup) ---
n++; const homeR = await fetchPage('/ar', null);
rec(`1.1.${n}`, 'Header has logo aria-label="تطبيق المعارض"', homeR.html.includes('aria-label="تطبيق المعارض"'));
n++; rec(`1.1.${n}`, 'Header has English locale toggle button', /<button[^>]*>English<\/button>/.test(homeR.html));
n++; rec(`1.1.${n}`, 'Header has login link', homeR.html.includes('/ar/login'));
n++; rec(`1.1.${n}`, 'Header has signup link', homeR.html.includes('/ar/signup'));
n++; rec(`1.1.${n}`, 'Header has 7 marketing nav links', ['/for-clients','/for-suppliers','/how-it-works','/pricing','/suppliers','/exhibitions','/blog'].every(p => homeR.html.includes(`/ar${p}`)));

// --- 1.1.X Footer chrome (legal links + site sections) ---
n++; rec(`1.1.${n}`, 'Footer has /legal/terms link', homeR.html.includes('/ar/legal/terms'));
n++; rec(`1.1.${n}`, 'Footer has /legal/privacy link', homeR.html.includes('/ar/legal/privacy'));
n++; rec(`1.1.${n}`, 'Footer has copyright / site name', homeR.html.includes('تطبيق المعارض'));

// --- 1.1.X Home page content sections ---
n++; rec(`1.1.${n}`, 'Home: H1 reads "تطبيق المعارض"', /<h1[^>]*>[^<]*تطبيق المعارض[^<]*<\/h1>/.test(homeR.html));
n++; rec(`1.1.${n}`, 'Home: subtitle "B2B لموردي المعارض"', homeR.html.includes('B2B') && homeR.html.includes('السعودية'));
n++; rec(`1.1.${n}`, 'Home: 3 ICP tabs (للعملاء/للموردين/لمنظمي)', homeR.html.includes('للعملاء') && homeR.html.includes('للموردين') && homeR.html.includes('لمنظمي'));
n++; rec(`1.1.${n}`, 'Home: 6 value props (موردون معتمدون / AI / ضمان / طوارئ / رسوم / سرعة)',
  homeR.html.includes('موردون معتمدون فقط') && homeR.html.includes('AI') && homeR.html.includes('ضمان') && homeR.html.includes('زر الطوارئ') && homeR.html.includes('رسوم شفافة') && homeR.html.includes('سرعة'));
n++; rec(`1.1.${n}`, 'Home: suppliers strip shows real company', homeR.html.includes('شركة الإبداع'));
n++; rec(`1.1.${n}`, 'Home: testimonials section present', homeR.html.includes('blockquote') || homeR.html.includes('شهادة') || homeR.html.includes('testimonials'));
n++; rec(`1.1.${n}`, 'Home: closing CTA', homeR.html.includes('ابدأ مجاناً') || homeR.html.includes('سجّل'));

// --- 1.1.X how-it-works content ---
n++; const hiwR = await fetchPage('/ar/how-it-works', null);
const numerals = (hiwR.html.match(/(?:^|\W)([1-7])\s*[.\):]/g) || []).length;
rec(`1.1.${n}`, 'how-it-works: 7+ step markers', numerals >= 7, `count=${numerals}`);
n++; rec(`1.1.${n}`, 'how-it-works: video placeholder/section', hiwR.html.includes('فيديو') || hiwR.html.includes('Video') || /<video/i.test(hiwR.html));

// --- 1.1.X for-clients / for-suppliers content ---
n++; const fcR = await fetchPage('/ar/for-clients', null);
rec(`1.1.${n}`, 'for-clients: H1 present', /<h1/.test(fcR.html));
n++; rec(`1.1.${n}`, 'for-clients: has CTA to RFQ/signup', fcR.html.includes('/ar/signup') || fcR.html.includes('rfqs/new'));
n++; const fsR = await fetchPage('/ar/for-suppliers', null);
rec(`1.1.${n}`, 'for-suppliers: H1 present', /<h1/.test(fsR.html));
n++; rec(`1.1.${n}`, 'for-suppliers: has CTA', fsR.html.includes('/ar/signup'));

// --- 1.1.X pricing page ---
n++; const prR = await fetchPage('/ar/pricing', null);
rec(`1.1.${n}`, 'pricing: H1 present', /<h1/.test(prR.html));
n++; rec(`1.1.${n}`, 'pricing: shows 2%/3%/5%/15% breakdown', /2%/.test(prR.html) && /3%/.test(prR.html) && /5%/.test(prR.html) && /15%/.test(prR.html));

// --- 1.1.X about + contact + suppliers + exhibitions + blog ---
n++; const abR = await fetchPage('/ar/about', null);
rec(`1.1.${n}`, 'about: H1 reads "من نحن"', abR.html.includes('من نحن'));
n++; const coR = await fetchPage('/ar/contact', null);
rec(`1.1.${n}`, 'contact: H1 present', /<h1/.test(coR.html));
n++; rec(`1.1.${n}`, 'contact: form/contact info', coR.html.includes('email') || coR.html.includes('بريد') || /<form/.test(coR.html));
n++; const supR = await fetchPage('/ar/suppliers', null);
rec(`1.1.${n}`, 'suppliers (public marketing): H1', /<h1/.test(supR.html));
n++; const exR = await fetchPage('/ar/exhibitions', null);
rec(`1.1.${n}`, 'exhibitions: H1', /<h1/.test(exR.html));
n++; const blR = await fetchPage('/ar/blog', null);
rec(`1.1.${n}`, 'blog index: H1 + lists 5 articles', /<h1/.test(blR.html) && BLOG_SLUGS.every(s => blR.html.includes(s)));

// --- 1.1.X Legal pages ---
n++; const tR = await fetchPage('/ar/legal/terms', null);
rec(`1.1.${n}`, 'legal/terms: H1 + body', /<h1/.test(tR.html) && tR.html.length > 2000);
n++; const pR = await fetchPage('/ar/legal/privacy', null);
rec(`1.1.${n}`, 'legal/privacy: H1 + body', /<h1/.test(pR.html) && pR.html.length > 2000);

// --- 1.1.X 404 + RTL ---
n++; const nfR = await fetchPage('/ar/this-does-not-exist-xyz', null);
rec(`1.1.${n}`, '404 returns 404 status', nfR.status === 404);
n++; rec(`1.1.${n}`, '404 page: Arabic body ("غير موجودة")', nfR.html.includes('غير موجودة') || nfR.html.includes('لم نعثر'));
n++; rec(`1.1.${n}`, '404 page: dir="rtl" + lang="ar" on <html>', nfR.html.includes('dir="rtl"') && nfR.html.includes('lang="ar"'));

// --- 1.1.X EN locale toggle ---
n++; const enR = await fetchPage('/en/about', null);
rec(`1.1.${n}`, '/en/about: H1 reads "About"', /About/i.test(enR.html));
n++; rec(`1.1.${n}`, '/en pages: dir="ltr" + lang="en"', enR.html.includes('dir="ltr"') && enR.html.includes('lang="en"'));

// Total
const okc = items.filter((i) => i.ok).length;
console.log(`\n=== Section 1.1: ${okc}/${items.length} ===`);
process.exit(okc === items.length ? 0 : 1);
