#!/usr/bin/env node
// Phase U2 — seed every Sprint-1+ surface with realistic Saudi-named
// data so the UI actually renders something when the flags are flipped on.
//
// Idempotent: every insert uses `upsert` on a natural key, or the script
// deletes the prior row first. Safe to re-run any number of times.
//
// Run:   pnpm demo:seed
// Or:    node scripts/seed-demo.mjs

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const envText = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
const env = Object.fromEntries(
  envText
    .split('\n')
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      const k = l.slice(0, i).trim();
      let v = l.slice(i + 1).trim();
      if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
      return [k, v];
    })
);

const sb = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const APP_URL = env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

// ─────────────────────────────────────────────
// Saudi-named extra suppliers (4 new + 1 existing m.supplier.test = 5 total).
// Pulling a fixed slice of the saudi-names library to keep results stable.
// Each is keyed by email so we can upsert deterministically.
// ─────────────────────────────────────────────
const EXTRA_SUPPLIERS = [
  {
    email: 'turki.qahtani.demo@example.com',
    full_name: 'تركي القحطاني',
    company_name: 'شركة نجد للمعارض',
    cr_number: '1010998001',
    vat_number: '300998001100003',
    specializations: ['booth', 'event'],
    cities: ['الرياض', 'الدمام'],
    bio: 'متخصصون في تصميم وتنفيذ أكشاك المعارض بمعايير الفخامة السعودية. 8 سنوات + 60 مشروع.',
    team_size: 15,
    years_of_experience: 8,
    is_concierge_managed: false,
    trust_signals: {
      identity_verified: true,
      zatca_verified: true,
      references_count: 4,
      photo_id_uploaded: true,
      gov_id_verified: true,
    },
  },
  {
    email: 'rahaf.hadrami.demo@example.com',
    full_name: 'رهف الحضرمي',
    company_name: 'الحجاز للإنتاج والتجهيز',
    cr_number: '1010998002',
    vat_number: '300998002200003',
    specializations: ['event', 'printing'],
    cities: ['جدة', 'مكة المكرمة'],
    bio: 'وكالة إنتاج فعاليات مقرّها جدة. نخدم المعارض على ساحل البحر الأحمر منذ 2019.',
    team_size: 18,
    years_of_experience: 6,
    is_concierge_managed: false,
    trust_signals: {
      identity_verified: true,
      zatca_verified: true,
      references_count: 2,
      photo_id_uploaded: true,
      gov_id_verified: false,
    },
  },
  {
    email: 'fahad.dossari.demo@example.com',
    full_name: 'فهد الدوسري',
    company_name: 'الشرقية برنت آند ديزاين',
    cr_number: '1010998003',
    vat_number: '300998003300003',
    specializations: ['printing', 'gifts'],
    cities: ['الدمام', 'الخبر'],
    bio: 'مطبعة عالية الجودة + هدايا مؤسسية. مقرّنا الخبر، نوصل لكل المملكة في 48 ساعة.',
    team_size: 8,
    years_of_experience: 4,
    is_concierge_managed: false,
    trust_signals: {
      identity_verified: true,
      zatca_verified: false,
      references_count: 1,
      photo_id_uploaded: false,
      gov_id_verified: false,
    },
  },
  {
    email: 'concierge.demo@example.com',
    full_name: 'فريق الكونسيرج',
    company_name: 'مُدار بواسطة Elmaared — البحر الأحمر',
    cr_number: '1010998004',
    vat_number: '300998004400003',
    specializations: ['booth', 'event', 'printing', 'gifts'],
    cities: ['الرياض', 'جدة', 'الدمام'],
    bio: 'حساب مُدار من فريق Elmaared خلال مرحلة الـ Concierge MVP — نعمل نيابة عن مزود يحتاج دعم تشغيلي.',
    team_size: 0,
    years_of_experience: 1,
    is_concierge_managed: true,
    trust_signals: {
      identity_verified: true,
      zatca_verified: true,
      references_count: 0,
      photo_id_uploaded: true,
      gov_id_verified: true,
    },
  },
];

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

async function findAuthUserId(email) {
  // Page through all users defensively — perPage caps at 1000 per call and
  // some Supabase versions ignore very large perPage values.
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`listUsers failed: ${error.message}`);
    const hit = data.users.find((u) => u.email === email);
    if (hit) return hit.id;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function deleteUserIfExists(email) {
  const id = await findAuthUserId(email);
  if (!id) return;

  // Clean up everything that FK-references this auth user, in order:
  //   supplier_trust_signals → suppliers (via supplier_id PK)
  //   suppliers (owner_id)
  //   companies (owner_id)
  //   profiles (id)
  //   auth.users (last)
  // If any of these don't exist for this user, the delete is a no-op.
  const { data: supplierRow } = await sb
    .from('suppliers')
    .select('id')
    .eq('owner_id', id)
    .maybeSingle();
  if (supplierRow?.id) {
    await sb.from('supplier_trust_signals').delete().eq('supplier_id', supplierRow.id);
    // Proposals on this supplier are blocking deletion too — drop them.
    await sb.from('proposals').delete().eq('supplier_id', supplierRow.id);
    await sb.from('suppliers').delete().eq('id', supplierRow.id);
  }
  await sb.from('companies').delete().eq('owner_id', id);
  await sb.from('profiles').delete().eq('id', id);

  const { error } = await sb.auth.admin.deleteUser(id, false);
  if (error) {
    throw new Error(`deleteUser ${email}: ${error.message}`);
  }
  await new Promise((r) => setTimeout(r, 200));
}

async function ensureAuthUser({ email, password, full_name, role }) {
  await deleteUserIfExists(email);
  let { data, error } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  });
  // Retry once if the email lingered after delete — happens on Supabase
  // when a recently-deleted user still occupies the email index for a beat.
  if (error && /already.*registered/i.test(error.message)) {
    await deleteUserIfExists(email);
    await new Promise((r) => setTimeout(r, 500));
    ({ data, error } = await sb.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    }));
  }
  if (error) throw new Error(`createUser ${email}: ${error.message}`);
  const uid = data.user.id;
  const { error: pe } = await sb
    .from('profiles')
    .insert({ id: uid, role, full_name, preferred_language: 'ar' });
  if (pe) throw new Error(`profile insert ${email}: ${pe.message}`);
  return uid;
}

async function ensureSupplier(s) {
  const password = 'DemoSupplier2026!';
  const ownerId = await ensureAuthUser({
    email: s.email,
    password,
    full_name: s.full_name,
    role: 'supplier',
  });

  // Insert the supplier row.
  const { data, error } = await sb
    .from('suppliers')
    .insert({
      owner_id: ownerId,
      company_name: s.company_name,
      cr_number: s.cr_number,
      vat_number: s.vat_number,
      status: 'approved',
      specializations: s.specializations,
      cities: s.cities,
      bio: s.bio,
      team_size: s.team_size,
      years_of_experience: s.years_of_experience,
      is_concierge_managed: s.is_concierge_managed,
      reviewed_at: new Date().toISOString(),
      bank_name: 'البنك الأهلي السعودي',
      iban: `SA00100000000000${s.cr_number.slice(-7)}`,
      account_holder_name: s.company_name.slice(0, 50),
    })
    .select('id')
    .single();
  if (error) throw new Error(`supplier insert ${s.email}: ${error.message}`);

  // Trust signals (one row per supplier, PK on supplier_id).
  const { error: te } = await sb.from('supplier_trust_signals').insert({
    supplier_id: data.id,
    ...s.trust_signals,
  });
  if (te) throw new Error(`trust_signals ${s.email}: ${te.message}`);

  console.log(`  ✓ supplier ${s.company_name} (${data.id}) + trust_signals`);
  return { id: data.id, ownerId };
}

async function deleteAllForClient(clientId) {
  // Cascade-safe ordering: child rows first.
  await sb.from('invoices').delete().eq('rfq_id', null); // no-op placeholder
  // Find rfqs by client and clean cascade.
  const { data: rfqs } = await sb
    .from('rfqs')
    .select('id')
    .eq('client_id', clientId);
  const rfqIds = (rfqs ?? []).map((r) => r.id);
  if (rfqIds.length === 0) return;

  // FK chain: invoices → escrow_transactions → agreements → proposals → rfqs.
  // Plus chats/messages/notifications on rfqs.
  await sb.from('invoices').delete().in('rfq_id', rfqIds);
  await sb.from('escrow_events').delete().in('escrow_id', (
    (await sb.from('escrow_transactions').select('id').in('rfq_id', rfqIds)).data ?? []
  ).map((e) => e.id));
  await sb.from('escrow_transactions').delete().in('rfq_id', rfqIds);
  await sb.from('agreement_revisions').delete().in('agreement_id', (
    (await sb.from('agreements').select('id').in('rfq_id', rfqIds)).data ?? []
  ).map((a) => a.id));
  await sb.from('agreements').delete().in('rfq_id', rfqIds);
  await sb.from('messages').delete().in('chat_id', (
    (await sb.from('chats').select('id').in('rfq_id', rfqIds)).data ?? []
  ).map((c) => c.id));
  await sb.from('chats').delete().in('rfq_id', rfqIds);
  await sb.from('notifications').delete().in('rfq_id', rfqIds);
  await sb.from('proposals').delete().in('rfq_id', rfqIds);
  await sb.from('rfqs').delete().in('id', rfqIds);
  await sb.from('user_milestones').delete().eq('user_id', clientId);
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

(async () => {
  console.log('=== Phase U2 demo seed ===');
  console.log('URL:', env.NEXT_PUBLIC_SUPABASE_URL);

  // 1. Test users (delegated to seed-test-users behaviour — re-run separately if absent)
  const clientEmail = 'ahmed.client.test@example.com';
  const clientId = await findAuthUserId(clientEmail);
  if (!clientId) {
    console.error(`\nMissing test user ${clientEmail}.`);
    console.error('Run `node scripts/seed-test-users.mjs` first, then re-run this script.');
    process.exit(1);
  }
  console.log(`  ✓ found client ${clientEmail} (${clientId})`);

  const supplierEmail = 'm.supplier.test@example.com';
  const baseSupplierOwnerId = await findAuthUserId(supplierEmail);
  if (!baseSupplierOwnerId) {
    console.error(`\nMissing test supplier ${supplierEmail}.`);
    process.exit(1);
  }
  const { data: baseSupplierRow } = await sb
    .from('suppliers')
    .select('id')
    .eq('owner_id', baseSupplierOwnerId)
    .single();
  const baseSupplierId = baseSupplierRow?.id;
  console.log(`  ✓ found base supplier ${supplierEmail} (${baseSupplierId})`);

  // Add a trust-signals row for the base supplier if missing (idempotent).
  await sb.from('supplier_trust_signals').delete().eq('supplier_id', baseSupplierId);
  await sb.from('supplier_trust_signals').insert({
    supplier_id: baseSupplierId,
    identity_verified: true,
    zatca_verified: true,
    references_count: 8,
    photo_id_uploaded: true,
    gov_id_verified: true,
  });
  console.log(`  ✓ trust_signals for base supplier`);

  // 2. Wipe the client's prior demo state.
  await deleteAllForClient(clientId);

  // 3. Extra suppliers (4 new with Saudi names + 1 concierge-managed).
  console.log('\n[2/5] Seeding 4 extra suppliers:');
  const extras = [];
  for (const s of EXTRA_SUPPLIERS) {
    const r = await ensureSupplier(s);
    extras.push({ ...s, supplierId: r.id });
  }

  const allSuppliers = [
    { supplierId: baseSupplierId, company_name: 'شركة الإبداع للمعارض والتجهيز' },
    ...extras,
  ];

  // 4. Find client company.
  const { data: companyRow } = await sb
    .from('companies')
    .select('id')
    .eq('owner_id', clientId)
    .single();
  const companyId = companyRow?.id;
  if (!companyId) {
    console.error('Client has no company. Run seed-test-users first.');
    process.exit(1);
  }

  // 5. Open RFQ — 5 proposals with the full AI-confidence spectrum.
  console.log('\n[3/5] Seeding open RFQ + 5 proposals:');
  const { data: rfqOpen, error: rfqErr } = await sb
    .from('rfqs')
    .insert({
      rfq_number: `RFQ-DEMO-OPEN-${Date.now().toString().slice(-6)}`,
      client_id: clientId,
      company_id: companyId,
      service_type: 'booth',
      title: 'جناح معرض LEAP 2027 — تصميم وتنفيذ كامل',
      description: 'نبحث عن مزوّد لتصميم وتنفيذ جناح بمساحة 100م² في معرض LEAP بالرياض، فبراير 2027.',
      details: { area_sqm: 100, expected_attendees: 5000 },
      exhibition_name: 'LEAP 2027',
      exhibition_city: 'الرياض',
      exhibition_date: '2027-02-15',
      delivery_location: 'مركز الرياض الدولي للمؤتمرات والمعارض',
      budget_min: 60000,
      budget_max: 80000,
      proposals_deadline: new Date(Date.now() + 14 * 86400_000).toISOString(),
      status: 'open',
    })
    .select('id')
    .single();
  if (rfqErr) throw new Error(`open rfq: ${rfqErr.message}`);
  console.log(`  ✓ open RFQ ${rfqOpen.id}`);

  // 5 proposals, each demoing one confidence bucket.
  const confidenceSpectrum = [
    { conf: 'high',    price: 67500, n: 32, var: 18.2 },
    { conf: 'medium',  price: 71200, n: 14, var: 27.5 },
    { conf: 'low',     price: 58000, n:  6, var: 33.0 },
    { conf: 'unknown', price: 92000, n:  2, var:  null },
    { conf: null,      price: 65000, n: null, var: null }, // pending — AIFallback fires
  ];
  for (let i = 0; i < 5; i++) {
    const c = confidenceSpectrum[i];
    const s = allSuppliers[i];
    const { error } = await sb.from('proposals').insert({
      rfq_id: rfqOpen.id,
      supplier_id: s.supplierId,
      total_price: c.price,
      currency: 'SAR',
      delivery_days: 30 + i * 3,
      description: `عرض من ${s.company_name} لتصميم وتنفيذ جناح LEAP 2027.`,
      scope_of_work: 'تصميم ثلاثي الأبعاد، تنفيذ كامل، تركيب، فك بعد المعرض.',
      payment_terms: '50% مقدّم، 50% عند التسليم.',
      validity_days: 14,
      ai_score: c.conf === null ? null : 70 + i * 4,
      ai_summary: c.conf === null ? null : 'تحليل مكتمل — لاحظ النطاق السوقي للتأكد من القيمة.',
      ai_confidence: c.conf,
      ai_sample_size: c.n,
      ai_variance_pct: c.var,
      ai_price_range_min: c.conf === null ? null : 55000,
      ai_price_range_max: c.conf === null ? null : 82000,
      status: 'submitted',
    });
    if (error) throw new Error(`proposal ${i}: ${error.message}`);
    console.log(`  ✓ proposal ${i + 1} — confidence=${c.conf} price=${c.price}`);
  }

  // 6. In-escrow RFQ — to demo LiveTimeline / TrustBar / ZATCAQR.
  console.log('\n[4/5] Seeding in-escrow RFQ + agreement + escrow + invoice:');
  const winningSupplier = allSuppliers[0];
  const { data: rfqEsc } = await sb
    .from('rfqs')
    .insert({
      rfq_number: `RFQ-DEMO-ESC-${Date.now().toString().slice(-6)}`,
      client_id: clientId,
      company_id: companyId,
      service_type: 'event',
      title: 'فعالية إطلاق منتج — Q1 2027',
      details: { area_sqm: 60 },
      exhibition_city: 'الرياض',
      exhibition_date: '2027-03-10',
      delivery_location: 'فندق ريتز كارلتون الرياض',
      budget_min: 40000,
      budget_max: 55000,
      status: 'in_escrow',
    })
    .select('id')
    .single();

  const { data: propEsc } = await sb
    .from('proposals')
    .insert({
      rfq_id: rfqEsc.id,
      supplier_id: winningSupplier.supplierId,
      total_price: 48000,
      delivery_days: 25,
      description: 'فعالية إطلاق منتج كاملة.',
      ai_score: 88,
      ai_confidence: 'high',
      status: 'accepted',
    })
    .select('id')
    .single();

  const { data: agree } = await sb
    .from('agreements')
    .insert({
      rfq_id: rfqEsc.id,
      proposal_id: propEsc.id,
      client_id: clientId,
      supplier_id: winningSupplier.supplierId,
      client_understanding: 'تنفيذ كامل لفعالية إطلاق منتج، ٦٠م²، ٢٥ يوم.',
      supplier_understanding: 'تصميم + تنفيذ + إدارة الفعالية لمدة يوم واحد.',
      final_text: 'الاتفاقية النهائية بين الطرفين.',
      status: 'active',
      client_approved_at: new Date().toISOString(),
      supplier_approved_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  const { data: esc } = await sb
    .from('escrow_transactions')
    .insert({
      agreement_id: agree.id,
      rfq_id: rfqEsc.id,
      total_amount: 48000,
      initial_deposit: 24000,
      final_payment: 24000,
      client_fee: 1200,
      supplier_fee: 1200,
      platform_revenue: 2400,
      supplier_net: 46800,
      vat_rate_applied: 0.15,
      client_fee_vat: 180,
      supplier_fee_vat: 180,
      total_vat: 360,
      status: 'work_in_progress',
      initial_deposit_received_at: new Date(Date.now() - 5 * 86400_000).toISOString(),
    })
    .select('id')
    .single();

  // A couple of escrow_events for LiveTimeline.
  await sb.from('escrow_events').insert([
    {
      escrow_id: esc.id,
      event_type: 'deposit_initiated',
      created_at: new Date(Date.now() - 7 * 86400_000).toISOString(),
    },
    {
      escrow_id: esc.id,
      event_type: 'deposit_confirmed',
      actor_id: clientId,
      created_at: new Date(Date.now() - 5 * 86400_000).toISOString(),
    },
    {
      escrow_id: esc.id,
      event_type: 'work_started',
      created_at: new Date(Date.now() - 4 * 86400_000).toISOString(),
    },
  ]);
  console.log(`  ✓ escrow ${esc.id} + 3 events`);

  // Invoice (mock ZATCA QR; real TLV encoding deferred to Track O).
  const { data: invRow } = await sb
    .from('invoices')
    .insert({
      invoice_number: `INV-DEMO-${Date.now().toString().slice(-6)}`,
      escrow_id: esc.id,
      rfq_id: rfqEsc.id,
      company_id: companyId,
      service_amount: 48000,
      platform_commission: 2400,
      vat_amount: 360,
      total_invoiced: 50760,
      buyer_name: 'شركة نواة المالية',
      buyer_vat_number: '300999001100003',
      buyer_cr_number: '1010999001',
      zatca_qr_code: 'AQ7QtuYR/Ya5LpAfPLO0/D1U3LJ3yV5lAg=', // mock TLV-base64
    })
    .select('id')
    .single();
  console.log(`  ✓ invoice ${invRow.id}`);

  // 7. user_milestones — CelebrationModal uses ROW-PRESENCE to mean
  // "already celebrated". So to make the modal fire on the demo, we need
  // to ensure NO row exists for ahmed's `first_rfq` (the dashboard will
  // detect that he has ≥1 RFQ but no row → triggers). deleteAllForClient
  // already wiped this; explicit no-op log for clarity.
  console.log('\n[5/5] Milestone state for celebration:');
  console.log(`  ✓ user_milestones cleared for ahmed (CelebrationModal will fire on first dashboard load)`);

  // ─────────────────────────────────────────────
  // Summary + URLs
  // ─────────────────────────────────────────────
  console.log('\n✅ Done. Visit:');
  console.log(`  Dashboard:        ${APP_URL}/ar/dashboard`);
  console.log(`  Compare (AI):     ${APP_URL}/ar/dashboard/rfqs/${rfqOpen.id}/compare`);
  console.log(`  Project Execute:  ${APP_URL}/ar/dashboard/rfqs/${rfqEsc.id}/project`);
  console.log(`  Day-of Console:   ${APP_URL}/ar/dashboard/rfqs/${rfqEsc.id}/event-day`);
  console.log(`  Escrow + TrustBar:${APP_URL}/ar/dashboard/rfqs/${rfqEsc.id}/escrow`);
  console.log(`  Invoice + ZATCA:  ${APP_URL}/ar/dashboard/invoices/${invRow.id}`);
  console.log(`  Discover:         ${APP_URL}/ar/discover`);
  console.log(`  Settings:         ${APP_URL}/ar/dashboard/settings/profile`);
  console.log(`\n  Login: ahmed.client.test@example.com / TestClient2026!`);
})().catch((err) => {
  console.error('FAIL:', err.message);
  process.exit(1);
});
