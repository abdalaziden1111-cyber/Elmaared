#!/usr/bin/env node
// Seed 3 realistic personas for end-to-end testing.
// Bypasses Resend email verification by setting email_confirm: true.
// Idempotent — deletes existing user with same email first.

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

// Load .env.local manually
const envText = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
const env = Object.fromEntries(
  envText
    .split('\n')
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      const k = l.slice(0, i);
      let v = l.slice(i + 1);
      if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
      return [k, v];
    })
);

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const PERSONAS = [
  {
    role: 'client',
    email: 'ahmed.client.test@example.com',
    password: 'TestClient2026!',
    profile: {
      full_name: 'أحمد العتيبي',
      phone: '+966501234567',
      preferred_language: 'ar',
    },
    company: {
      name: 'شركة نواة المالية',
      legal_name: 'نواة المالية للتقنية',
      cr_number: '1010999001',
      vat_number: '300999001100003',
      size: '11-50',
      industry: 'Fintech',
      city: 'الرياض',
    },
  },
  {
    role: 'supplier',
    email: 'm.supplier.test@example.com',
    password: 'TestSupplier2026!',
    profile: {
      full_name: 'محمد الزهراني',
      phone: '+966551234567',
      preferred_language: 'ar',
    },
    supplier: {
      company_name: 'شركة الإبداع للمعارض والتجهيز',
      legal_name: 'الإبداع للمعارض والتجهيز ش.م.م',
      cr_number: '1010999002',
      vat_number: '300999002200003',
      status: 'approved',
      specializations: ['booth', 'event'],
      cities: ['الرياض', 'جدة'],
      bio: 'متخصصون في تصميم وتنفيذ أكشاك المعارض والفعاليات منذ 2015. نفّذنا 200+ مشروع لعملاء في القطاعات المالية والتقنية.',
      website: 'https://example.com',
      team_size: 25,
      years_of_experience: 11,
      bank_name: 'البنك الأهلي السعودي',
      iban: 'SA0010000000000000999002',
      account_holder_name: 'الإبداع للمعارض',
    },
  },
  {
    role: 'admin',
    email: 'sara.admin.test@example.com',
    password: 'TestAdmin2026!',
    profile: {
      full_name: 'سارة الحربي',
      phone: '+966561234567',
      preferred_language: 'ar',
    },
  },
];

async function deleteUserIfExists(email) {
  const { data: list } = await supabase.auth.admin.listUsers();
  const u = list?.users?.find((x) => x.email === email);
  if (u) {
    console.log(`  ↺ deleting existing user ${email} (${u.id})`);
    await supabase.auth.admin.deleteUser(u.id);
  }
}

async function seedPersona(p) {
  console.log(`\n[${p.role}] ${p.email}`);
  await deleteUserIfExists(p.email);

  // 1. Create auth user with email_confirm true → skips verification
  const { data: created, error: ce } = await supabase.auth.admin.createUser({
    email: p.email,
    password: p.password,
    email_confirm: true,
    user_metadata: { full_name: p.profile.full_name },
  });
  if (ce) throw new Error(`createUser failed: ${ce.message}`);
  const uid = created.user.id;
  console.log(`  ✓ auth user created: ${uid}`);

  // 2. Insert profile
  const { error: pe } = await supabase
    .from('profiles')
    .insert({ id: uid, role: p.role, ...p.profile });
  if (pe) throw new Error(`profile insert failed: ${pe.message}`);
  console.log(`  ✓ profile inserted (role=${p.role})`);

  // 3. Role-specific
  if (p.role === 'client') {
    const { error: coe } = await supabase
      .from('companies')
      .insert({ owner_id: uid, ...p.company });
    if (coe) throw new Error(`company insert failed: ${coe.message}`);
    console.log(`  ✓ company "${p.company.name}" inserted`);
  } else if (p.role === 'supplier') {
    const supplierRow = {
      owner_id: uid,
      ...p.supplier,
      reviewed_at: new Date().toISOString(),
    };
    const { error: se } = await supabase.from('suppliers').insert(supplierRow);
    if (se) throw new Error(`supplier insert failed: ${se.message}`);
    console.log(`  ✓ supplier "${p.supplier.company_name}" inserted (status=${p.supplier.status})`);
  }
}

(async () => {
  console.log('Seeding 3 test users into', env.NEXT_PUBLIC_SUPABASE_URL);
  for (const p of PERSONAS) {
    try {
      await seedPersona(p);
    } catch (e) {
      console.error(`  ✗ ${e.message}`);
      process.exit(1);
    }
  }
  console.log('\n✅ Done. Credentials:');
  for (const p of PERSONAS) {
    console.log(`  ${p.role.padEnd(8)} → ${p.email}  |  ${p.password}`);
  }
})();
