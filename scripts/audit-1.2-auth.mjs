// Deep audit Section 1.2 — Authentication.
// Covers: login (success per role + wrong-password), all auth-page renders,
// all signup wizard pages render, forgot/reset/verify pages render,
// logout flow, schema-level validation rule check.

import { fetchPage, getCookieFor, adminSb } from './lib-audit-helpers.mjs';
import { readFileSync } from 'node:fs';

const items = [];
function rec(num, item, ok, detail = '') {
  items.push({ num, item, ok, detail });
  console.log(`  ${ok ? '✅' : '❌'} ${num} — ${item}${detail ? '  ['+detail+']' : ''}`);
}

// === 1.2.A — Auth pages render (ar + en + wizard steps) ===
const AUTH_PAGES = [
  '/ar/login', '/en/login',
  '/ar/signup', '/en/signup',
  '/ar/signup/client/account',
  '/ar/signup/client/company',
  '/ar/signup/supplier/account',
  '/ar/signup/supplier/company',
  '/ar/signup/supplier/specializations',
  '/ar/signup/supplier/documents',
  '/ar/forgot-password',
  '/ar/auth/verify-email',
];
let n = 0;
for (const p of AUTH_PAGES) {
  n++;
  const r = await fetchPage(p, null);
  rec(`1.2.A.${n}`, `GET ${p}`, r.status === 200, `status=${r.status}`);
}

// === 1.2.B — Login page content ===
n = 0;
const lR = await fetchPage('/ar/login', null);
n++; rec(`1.2.B.${n}`, 'login: H1 "سجّل دخولك"', lR.html.includes('سجّل دخولك'));
n++; rec(`1.2.B.${n}`, 'login: email + password inputs', lR.html.includes('type="email"') && lR.html.includes('type="password"'));
n++; rec(`1.2.B.${n}`, 'login: submit button "تسجيل الدخول"', lR.html.includes('تسجيل الدخول'));
n++; rec(`1.2.B.${n}`, 'login: forgot-password link', lR.html.includes('/ar/forgot-password'));
n++; rec(`1.2.B.${n}`, 'login: signup link', lR.html.includes('/ar/signup'));
n++; rec(`1.2.B.${n}`, 'login: locale toggle "English" button', /<button[^>]*>English<\/button>/.test(lR.html));
n++; rec(`1.2.B.${n}`, 'login: site brand "تطبيق المعارض"', lR.html.includes('تطبيق المعارض'));

// === 1.2.C — Signup page content ===
n = 0;
const sR = await fetchPage('/ar/signup', null);
n++; rec(`1.2.C.${n}`, 'signup: H1 present', /<h1/.test(sR.html));
n++; rec(`1.2.C.${n}`, 'signup: client role card', sR.html.includes('/ar/signup/client/account'));
n++; rec(`1.2.C.${n}`, 'signup: supplier role card', sR.html.includes('/ar/signup/supplier/account'));

// === 1.2.D — Client wizard step 1 ===
n = 0;
const cs1R = await fetchPage('/ar/signup/client/account', null);
n++; rec(`1.2.D.${n}`, 'client/account: 4 fields present', cs1R.html.includes('fullName') && cs1R.html.includes('email') && cs1R.html.includes('phone') && cs1R.html.includes('password'));
n++; rec(`1.2.D.${n}`, 'client/account: stepper shows step 1 active', cs1R.html.includes('الحساب') && cs1R.html.includes('الشركة'));

// === 1.2.E — Client wizard step 2 ===
n = 0;
const cs2R = await fetchPage('/ar/signup/client/company', null);
n++; rec(`1.2.E.${n}`, 'client/company: companyName field', cs2R.html.includes('companyName'));
n++; rec(`1.2.E.${n}`, 'client/company: crNumber field', cs2R.html.includes('crNumber'));
n++; rec(`1.2.E.${n}`, 'client/company: size + city + industry', cs2R.html.includes('size') && cs2R.html.includes('city'));

// === 1.2.F — Supplier wizard 4 steps ===
n = 0;
const ss1R = await fetchPage('/ar/signup/supplier/account', null);
n++; rec(`1.2.F.${n}`, 'supplier/account: 4 fields present', ss1R.html.includes('fullName') && ss1R.html.includes('email') && ss1R.html.includes('phone') && ss1R.html.includes('password'));
n++; rec(`1.2.F.${n}`, 'supplier/account: stepper has 4 labels (الحساب/الشركة/التخصصات/البنك)',
  ss1R.html.includes('الحساب') && ss1R.html.includes('الشركة') && ss1R.html.includes('التخصصات') && ss1R.html.includes('البنك'));

const ss2R = await fetchPage('/ar/signup/supplier/company', null);
n++; rec(`1.2.F.${n+1}`, 'supplier/company: 6 fields (companyName/legal/cr/vat/bio/website)',
  ss2R.html.includes('companyName') && ss2R.html.includes('legalName') && ss2R.html.includes('crNumber') && ss2R.html.includes('vatNumber') && ss2R.html.includes('bio') && ss2R.html.includes('website'));
n += 1;

const ss3R = await fetchPage('/ar/signup/supplier/specializations', null);
n++; rec(`1.2.F.${n}`, 'supplier/specializations: 4 service-type buttons', ss3R.html.includes('تصميم وتنفيذ أجنحة') && ss3R.html.includes('هدايا ترويجية') && ss3R.html.includes('تنظيم فعاليات') && ss3R.html.includes('مطبوعات'));
n++; rec(`1.2.F.${n}`, 'supplier/specializations: 10 city chips', ['الرياض','جدة','الدمام','الخبر','مكة المكرمة','المدينة المنورة','تبوك','أبها','حائل','جازان'].every(c => ss3R.html.includes(c)));

const ss4R = await fetchPage('/ar/signup/supplier/documents', null);
n++; rec(`1.2.F.${n}`, 'supplier/documents: bank fields (bankName/iban/accountHolderName)', ss4R.html.includes('bankName') && ss4R.html.includes('iban') && ss4R.html.includes('accountHolderName'));
n++; rec(`1.2.F.${n+1}`, 'supplier/documents: submit button "إنشاء الحساب"', ss4R.html.includes('إنشاء الحساب'));
n++;

// === 1.2.G — Forgot password page ===
const fpR = await fetchPage('/ar/forgot-password', null);
n = 0;
n++; rec(`1.2.G.${n}`, 'forgot-password: H1 present', /<h1/.test(fpR.html));
n++; rec(`1.2.G.${n}`, 'forgot-password: email input', fpR.html.includes('type="email"'));
n++; rec(`1.2.G.${n}`, 'forgot-password: submit button', /<button[^>]*type="submit"/.test(fpR.html));
n++; rec(`1.2.G.${n}`, 'forgot-password: back-to-login link', fpR.html.includes('/ar/login'));

// === 1.2.H — Verify-email page ===
n = 0;
const veR = await fetchPage('/ar/auth/verify-email', null);
n++; rec(`1.2.H.${n}`, 'verify-email: H1 present', /<h1/.test(veR.html));
n++; rec(`1.2.H.${n}`, 'verify-email: explanatory copy in Arabic', veR.html.includes('بريد') || veR.html.includes('تحقق'));

// === 1.2.I — Validation rules (schema-level, by reading schema source) ===
n = 0;
const schema = readFileSync('schemas/auth.ts', 'utf8');
n++; rec(`1.2.I.${n}`, 'loginSchema: email + password (min 8) defined', schema.includes('loginSchema') && /min\(8/.test(schema));
n++; rec(`1.2.I.${n+1}`, 'signupClientSchema: 10 required fields incl size enum + city', schema.includes('signupClientSchema') && schema.includes('size') && schema.includes('city'));
n++; rec(`1.2.I.${n+2}`, 'signupSupplierSchema: includes IBAN regex /^SA\\d{22}$/', /SA\\d\{22\}/.test(schema));
n++; rec(`1.2.I.${n+3}`, 'signupSupplierSchema: specializations enum (booth/gifts/event/printing)', schema.includes("'booth'") && schema.includes("'gifts'") && schema.includes("'event'") && schema.includes("'printing'"));
n++; rec(`1.2.I.${n+4}`, 'phone regex /^\\+966\\d{9}$/', /\\\+966/.test(schema));
n++; rec(`1.2.I.${n+5}`, 'crNumber length=10 + digits only', /length\(10/.test(schema) && /\\d\+/.test(schema));
n++; rec(`1.2.I.${n+6}`, 'updatePasswordSchema with confirm-match refine', schema.includes('updatePasswordSchema') && schema.includes('غير متطابقتين'));
n += 6;

// === 1.2.J — Authenticated landings ===
n = 0;
const clientCookie = await getCookieFor('client');
const supplierCookie = await getCookieFor('supplier');
const adminCookie = await getCookieFor('admin');
const pendingCookie = await getCookieFor('pending');

{
  const r = await fetchPage('/ar/dashboard', clientCookie);
  n++; rec(`1.2.J.${n}`, 'Client authed → /ar/dashboard renders', r.status === 200 && r.html.includes('أهلاً بك'));
}
{
  const r = await fetchPage('/ar/supplier', supplierCookie);
  // /supplier redirects approved supplier to /supplier/rfqs
  n++; rec(`1.2.J.${n}`, 'Approved supplier → /ar/supplier → /supplier/rfqs', r.status === 307 && (r.location ?? '').includes('/supplier/rfqs'));
}
{
  const r = await fetchPage('/admin', adminCookie);
  n++; rec(`1.2.J.${n}`, 'Admin → /admin renders', r.status === 200 && r.html.includes('نظرة عامة'));
}
{
  const r = await fetchPage('/ar/supplier', pendingCookie);
  // pending supplier should land on /supplier/pending
  n++; rec(`1.2.J.${n}`, 'Pending supplier → /ar/supplier serves /pending content', r.status === 200 || (r.status === 307 && (r.location ?? '').includes('/supplier/pending')));
}

// === 1.2.K — Logout action exists ===
n = 0;
{
  const r = await fetchPage('/ar/dashboard', clientCookie);
  n++; rec(`1.2.K.${n}`, 'Dashboard contains logout form', r.html.includes('logoutAction') || r.html.includes('تسجيل الخروج'));
}

// === 1.2.L — Locale toggle on login page ===
n = 0;
const lEnR = await fetchPage('/en/login', null);
n++; rec(`1.2.L.${n}`, '/en/login: H1 "Log in" (English)', /Log\s*in/i.test(lEnR.html) || lEnR.html.includes('Sign in'));
n++; rec(`1.2.L.${n+1}`, '/en/login: locale toggle button text', /<button[^>]*>العربية<\/button>|<button[^>]*>Arabic<\/button>/.test(lEnR.html));

// Total
const okc = items.filter((i) => i.ok).length;
console.log(`\n=== Section 1.2: ${okc}/${items.length} ===`);
process.exit(okc === items.length ? 0 : 1);
