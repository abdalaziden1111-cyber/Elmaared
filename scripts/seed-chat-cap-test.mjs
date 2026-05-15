// Seeds 4 dummy auth users + supplier rows + proposals on the seeded open
// RFQ (RFQ-2026-00001) so we can test the 4-chat-cap trigger.
//
// After this script: that RFQ has 5 submitted proposals total (1 existing
// + 4 new). Shortlisting the first 4 should succeed (chats 2..4 created
// after the original); shortlisting the 5th should fail with CHAT_CAP_REACHED.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env.local');
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const eq = l.indexOf('=');
      return [l.slice(0, eq).trim(), l.slice(eq + 1).trim().replace(/^"|"$/g, '')];
    })
);

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const RFQ_ID = '06d8e776-aae9-4721-8ab5-5772dd3df464';
const NUM_NEW_SUPPLIERS = 4;

const DUMMY_SUPPLIERS = [
  { stem: 'edge-events',     name: 'إيدج للفعاليات',        cr: '1010888001' },
  { stem: 'horizon-booths',  name: 'هورايزن للأجنحة',       cr: '1010888002' },
  { stem: 'modular-build',   name: 'مودولار للتشييد',       cr: '1010888003' },
  { stem: 'apex-design',     name: 'إيبكس للتصميم',         cr: '1010888004' },
];

async function ensureSupplier(idx) {
  const def = DUMMY_SUPPLIERS[idx];
  const email = `${def.stem}.captest@example.com`;
  let userId;

  // Try to find existing user
  const list = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existingUser = list.data.users.find((u) => u.email === email);
  if (existingUser) {
    userId = existingUser.id;
  } else {
    const { data, error } = await sb.auth.admin.createUser({
      email,
      password: `CapTest${idx + 1}-Pass!`,
      email_confirm: true,
      user_metadata: { full_name: def.name, role: 'supplier' },
    });
    if (error) throw new Error(`createUser ${email}: ${error.message}`);
    userId = data.user.id;
  }

  // Profile (upsert)
  await sb.from('profiles').upsert({
    id: userId,
    role: 'supplier',
    full_name: def.name,
    phone: `+96655${String(idx).padStart(7, '0')}`,
    preferred_language: 'ar',
  });

  // Supplier row — approved so they match RFQs
  const { data: existing } = await sb
    .from('suppliers')
    .select('id')
    .eq('owner_id', userId)
    .maybeSingle();
  let supplierId;
  if (existing) {
    supplierId = existing.id;
  } else {
    const { data, error } = await sb
      .from('suppliers')
      .insert({
        owner_id: userId,
        company_name: def.name,
        legal_name: def.name,
        cr_number: def.cr,
        vat_number: null,
        status: 'approved',
        specializations: ['booth'],
        cities: ['الرياض', 'جدة'],
        bio: 'مورد اختبار لسعة المحادثات.',
        bank_name: 'البنك الأهلي السعودي',
        iban: `SA${String(idx).padStart(22, '8')}`,
        account_holder_name: def.name,
      })
      .select('id')
      .single();
    if (error) throw new Error(`create supplier ${def.name}: ${error.message}`);
    supplierId = data.id;
  }

  return { userId, supplierId, email, name: def.name };
}

async function ensureProposal(supplierId, name, idx) {
  // Check if proposal already exists for (rfq, supplier)
  const { data: existing } = await sb
    .from('proposals')
    .select('id, status')
    .eq('rfq_id', RFQ_ID)
    .eq('supplier_id', supplierId)
    .maybeSingle();
  if (existing) return existing.id;

  const { data, error } = await sb
    .from('proposals')
    .insert({
      rfq_id: RFQ_ID,
      supplier_id: supplierId,
      total_price: 60000 + idx * 5000,
      delivery_days: 25 + idx * 3,
      description: `عرض اختبار للسعة من ${name} — تصميم وتنفيذ كامل بمواصفات السلامة وضمان جودة المواد.`,
      scope_of_work:
        'تصميم ثلاثي الأبعاد + تنفيذ هيكل حديدي + كسوة + إنارة + شاشات LED + أثاث + نقل وتركيب وفك بعد المعرض. كل المواد جديدة.',
      excluded_items: 'تكاليف الكهرباء ووصلات الإنترنت من إدارة المعرض.',
      payment_terms: '50% مقدماً، 50% بعد التركيب والقبول.',
      validity_days: 14,
      status: 'submitted',
    })
    .select('id')
    .single();
  if (error) throw new Error(`create proposal: ${error.message}`);
  return data.id;
}

(async () => {
  const results = [];
  for (let i = 0; i < NUM_NEW_SUPPLIERS; i++) {
    const s = await ensureSupplier(i);
    const proposalId = await ensureProposal(s.supplierId, s.name, i);
    results.push({ ...s, proposalId });
    console.log(`✓ ${s.name} (${s.email}) → proposal ${proposalId}`);
  }
  console.log('\nDone. RFQ_ID:', RFQ_ID);
  console.log('Total proposals on RFQ:', (await sb.from('proposals').select('id', { count: 'exact', head: true }).eq('rfq_id', RFQ_ID)).count);
})();
