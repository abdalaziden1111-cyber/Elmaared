import { fetchPage, getCookieFor, adminSb } from './lib-audit-helpers.mjs';
import { readFileSync } from 'node:fs';

const items = [];
function rec(num, item, ok, detail = '') {
  items.push({ num, item, ok, detail });
  console.log(`  ${ok ? '✅' : '❌'} ${num} — ${item}${detail ? '  ['+detail+']' : ''}`);
}

const clientCookie = await getCookieFor('client');

// === Profile page ===
const pR = await fetchPage('/ar/dashboard/settings/profile', clientCookie);
rec('1.4.1', '/ar/dashboard/settings/profile → 200', pR.status === 200);
rec('1.4.2', 'profile: H1 "إعدادات الحساب"', pR.html.includes('إعدادات الحساب'));
rec('1.4.3', 'profile: link to /settings/company', pR.html.includes('/dashboard/settings/company') || pR.html.includes('بيانات الشركة'));
rec('1.4.4', 'profile: fullName + phone fields rendered', pR.html.includes('name="fullName"') && pR.html.includes('name="phone"'));
rec('1.4.5', 'profile: 2 forms (profile + password change)', (pR.html.match(/<form/g)?.length ?? 0) >= 2);
rec('1.4.6', 'profile: password change form has password + confirm fields', pR.html.includes('name="password"') && pR.html.includes('name="confirmPassword"'));

// Profile form pre-filled with current values
const { data: prof } = await adminSb.from('profiles').select('full_name, phone').eq('id', 'e8505a1f-473b-4d3e-a8fc-a31b5f8bfe81').single();
rec('1.4.7', 'profile: fullName pre-filled', prof.full_name ? pR.html.includes(prof.full_name) : true);
rec('1.4.8', 'profile: phone pre-filled', prof.phone ? pR.html.includes(prof.phone) : true);

// === Company page ===
const cR = await fetchPage('/ar/dashboard/settings/company', clientCookie);
rec('1.4.9', '/ar/dashboard/settings/company → 200', cR.status === 200);
rec('1.4.10', 'company: H1 present', /<h1/.test(cR.html));
rec('1.4.11', 'company: companyName field', cR.html.includes('name="companyName"'));
rec('1.4.12', 'company: legalName field', cR.html.includes('name="legalName"'));
rec('1.4.13', 'company: crNumber field', cR.html.includes('name="crNumber"'));
rec('1.4.14', 'company: vatNumber field', cR.html.includes('name="vatNumber"'));
rec('1.4.15', 'company: size field (enterprise/mid/startup)', cR.html.includes('name="size"'));
rec('1.4.16', 'company: industry field', cR.html.includes('name="industry"'));

// === Server actions exist ===
const src = readFileSync('app/actions/client-profile.ts', 'utf8');
rec('1.4.17', 'updateClientProfileAction exported', src.includes('export async function updateClientProfileAction'));
rec('1.4.18', 'updateClientCompanyAction exported', src.includes('export async function updateClientCompanyAction'));
rec('1.4.19', 'profile-form imports updateClientProfileAction', readFileSync('app/[locale]/dashboard/settings/profile/profile-form.tsx', 'utf8').includes('updateClientProfileAction'));
rec('1.4.20', 'company-form imports updateClientCompanyAction', readFileSync('app/[locale]/dashboard/settings/company/company-form.tsx', 'utf8').includes('updateClientCompanyAction'));
rec('1.4.21', 'profile-form imports updatePasswordAction', readFileSync('app/[locale]/dashboard/settings/profile/profile-form.tsx', 'utf8').includes('updatePasswordAction'));

// === Audit log emission check ===
rec('1.4.22', 'updateClientProfileAction emits audit row (recordAudit call)', src.includes('recordAudit'));
rec('1.4.23', 'audit_logs has client_profile_updated rows', (await adminSb.from('audit_logs').select('id', { count: 'exact', head: true }).eq('action', 'client_profile_updated')).count > 0);

const okc = items.filter(i => i.ok).length;
console.log(`\n=== Section 1.4: ${okc}/${items.length} ===`);
process.exit(okc === items.length ? 0 : 1);
