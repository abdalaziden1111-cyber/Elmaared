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
import { createHash } from 'node:crypto';

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
    extras.push({ ...s, supplierId: r.id, ownerId: r.ownerId });
  }

  const allSuppliers = [
    {
      supplierId: baseSupplierId,
      ownerId: baseSupplierOwnerId, // Phase W2.5 needs this for lead_scores
      company_name: 'شركة الإبداع للمعارض والتجهيز',
    },
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

  // 7. user_milestones — see Phase W2.1 below; we now seed historical
  // milestones with one unclaimed (500k_gmv) so the CelebrationModal
  // demonstrates the journey instead of firing only the first one.

  // ═══════════════════════════════════════════════════════════════════
  // Phase W2 — Phase V demo data
  //
  // Every section below seeds rows for a Phase V surface. All Phase V
  // tables are wiped first for idempotency. AI-derived rows are tagged
  // model='mock-seed' so the admin dashboards can visibly mark them.
  // ═══════════════════════════════════════════════════════════════════

  console.log('\n=== Phase W2 — Phase V demo data ===');

  // Resolve admin (sara) email for W2.7.
  const adminEmail = 'sara.admin.test@example.com';
  const adminId = await findAuthUserId(adminEmail);
  if (!adminId) {
    console.warn(`  ⚠ ${adminEmail} not found — skipping admin preferences row.`);
  }

  // ── W2 wipes — all idempotent ──
  await sb.from('ai_usage_log').delete().eq('model', 'mock-seed');
  await sb.from('ai_score_cache').delete().like('hash', 'mock-seed-%');
  await sb.from('lead_scores').delete().like('narrative', '[mock]%');
  // Wipe synthetic lead auth users. profiles + lead_scores cascade via
  // their FK ON DELETE CASCADE chain.
  for (let i = 0; i < 15; i++) {
    const email = `lead.synth.${i.toString().padStart(2, '0')}@example.com`;
    const uid = await findAuthUserId(email);
    if (uid) {
      // profiles cascade-deletes on auth.users delete, but RLS / FKs from
      // lead_scores → profiles also cascade. We DO need to wipe lead_scores
      // first if narrative happens to be NULL (cold leads) since the
      // narrative-LIKE wipe above misses those.
      await sb.from('lead_scores').delete().eq('user_id', uid);
      await sb.from('profiles').delete().eq('id', uid);
      await sb.auth.admin.deleteUser(uid, false).catch(() => {});
    }
  }
  await sb
    .from('notification_preferences')
    .delete()
    .in('user_id', [clientId, baseSupplierOwnerId, adminId].filter(Boolean));
  await sb.from('blog_posts').delete().like('slug', 'demo-w2-%');

  // ── W2.1 Milestones history ──
  // 6 personal firsts spread across past 60 days + 100k_gmv claimed
  // 7 days ago. 500k_gmv left UNCLAIMED → CelebrationModal will fire
  // on next dashboard visit. 1m_gmv + yearly_anniversary deliberately
  // absent (locked).
  const dayMs = 86400_000;
  const milestoneSeed = [
    { type: 'first_rfq', days: 58 },
    { type: 'first_proposal_received', days: 55 },
    { type: 'first_chat_opened', days: 50 },
    { type: 'first_agreement_signed', days: 30 },
    { type: 'first_escrow_funded', days: 28 },
    { type: 'first_project_completed', days: 10 },
    { type: '100k_gmv', days: 7 },
    // 500k_gmv NOT inserted — modal fires for it
    // 1m_gmv NOT inserted — locked
  ];
  for (const m of milestoneSeed) {
    const { error } = await sb.from('user_milestones').insert({
      user_id: clientId,
      milestone_type: m.type,
      achieved_at: new Date(Date.now() - m.days * dayMs).toISOString(),
    });
    if (error && !/duplicate/i.test(error.message)) {
      throw new Error(`milestone ${m.type}: ${error.message}`);
    }
  }
  console.log(
    `  ✓ W2.1: 7 milestones seeded for ahmed (500k_gmv unclaimed → modal fires)`
  );

  // ── W2.2 AI usage log (50 rows) ──
  // Realistic Sonnet shape; 30% cache hits (cost_usd=0). Spread across
  // past 30 days. user_id rotates across demo suppliers + ahmed.
  function computeMockCost(tokensIn, tokensOut) {
    // Sonnet 4.6 rates: $3/MTok in, $15/MTok out (matches lib/ai/cost.ts).
    return (tokensIn / 1_000_000) * 3 + (tokensOut / 1_000_000) * 15;
  }
  const usageUsers = [clientId, ...allSuppliers.map((s) => s.ownerId).filter(Boolean)];
  const usageRows = [];
  for (let i = 0; i < 50; i++) {
    const isCacheHit = i % 3 === 0; // ~33%
    const opIdx = i % 5;
    const operation =
      opIdx < 3 ? 'score_proposal' : opIdx === 3 ? 'analyze_agreement' : 'score_lead';
    const tokensIn = isCacheHit ? 0 : 800 + ((i * 137) % 3700);
    const tokensOut = isCacheHit ? 0 : 200 + ((i * 71) % 1000);
    const userId = usageUsers[i % usageUsers.length] ?? null;
    usageRows.push({
      user_id: userId,
      operation,
      tokens_in: tokensIn,
      tokens_out: tokensOut,
      cost_usd: isCacheHit ? 0 : computeMockCost(tokensIn, tokensOut),
      model: 'mock-seed',
      cache_hit: isCacheHit,
      request_id: `mock-${i.toString().padStart(3, '0')}`,
      created_at: new Date(Date.now() - (30 - i % 30) * dayMs).toISOString(),
    });
  }
  const usageBatchSize = 50;
  for (let b = 0; b < usageRows.length; b += usageBatchSize) {
    const { error } = await sb
      .from('ai_usage_log')
      .insert(usageRows.slice(b, b + usageBatchSize));
    if (error) throw new Error(`ai_usage_log batch ${b}: ${error.message}`);
  }
  console.log(`  ✓ W2.2: 50 ai_usage_log rows (model='mock-seed', ~33% cache hits)`);

  // ── W2.3 AI score cache (10 entries) ──
  // Mock-seeded with deterministic hashes (mock-seed-N). The runtime
  // hashKey() won't produce these prefixes, so real scoring still misses
  // these. Demonstrates the table is populated for admin diagnostics.
  const cacheTtlDays = 30;
  const cacheRows = [];
  for (let i = 0; i < 10; i++) {
    cacheRows.push({
      hash: `mock-seed-${i.toString().padStart(4, '0')}-${createHash('sha256')
        .update(`mock-seed-${i}`)
        .digest('hex')
        .slice(0, 56)}`,
      operation: i % 2 === 0 ? 'score_proposal' : 'analyze_agreement',
      payload: {
        score: 65 + i * 3,
        summary: `[mock] ملخص الذكاء الاصطناعي رقم ${i + 1} — قيمة جيّدة مقارنة بالسوق.`,
        strengths: ['تسعير تنافسي', 'سجل عمل واضح'],
        concerns: i % 3 === 0 ? ['شروط الدفع تحتاج توضيح'] : [],
        breakdown: { price: 80, delivery: 75, completeness: 70, professionalism: 80, trackRecord: 70 },
      },
      model: 'mock-seed',
      expires_at: new Date(Date.now() + cacheTtlDays * dayMs).toISOString(),
    });
  }
  const { error: cacheErr } = await sb.from('ai_score_cache').insert(cacheRows);
  if (cacheErr) throw new Error(`ai_score_cache: ${cacheErr.message}`);
  console.log(`  ✓ W2.3: 10 ai_score_cache entries (hash prefix 'mock-seed-')`);

  // ── W2.4 Agreement risky clauses ──
  // Update the in-escrow agreement created above with 3 mock risky
  // clauses. Renders <RiskyClauses> panel immediately + the W4.3 badge
  // above the AI section.
  const riskyClauses = [
    {
      clause: 'غرامة تأخير الدفع 5% أسبوعياً',
      deviation:
        'أعلى بكثير من المعتاد (1-2% شهرياً) — راجع مع مستشار قانوني قبل التوقيع.',
      severity: 'high',
    },
    {
      clause: 'نطاق القوة القاهرة يشمل أي عذر تشغيلي',
      deviation:
        'النموذج السعودي يقصرها على الأحوال الجوية + التعطيلات الحكومية فقط.',
      severity: 'medium',
    },
    {
      clause: 'اختصاص محاكم دبي للنزاعات',
      deviation:
        'الأصل في السوق السعودي محاكم تجارية محلية + بوابة ناجز كقناة أولى.',
      severity: 'low',
    },
  ];
  await sb
    .from('agreements')
    .update({
      ai_risky_clauses: riskyClauses,
      ai_recommendation:
        '[mock] راجع البنود المُعلَّمة قبل التوقيع — الغرامة الأسبوعية بحاجة تخفيف، والاختصاص القضائي يفضّل تعديله للسعودية.',
    })
    .eq('id', agree.id);
  console.log(`  ✓ W2.4: 3 risky_clauses seeded on agreement ${agree.id}`);

  // ── W2.5 Lead scores (20 leads) ──
  // 15 synthetic auth.users + profiles + ahmed + 4 demo suppliers = 20.
  // Synthetic users keyed by email `lead.synth.NN@example.com` for
  // deterministic wipe-on-rerun. profiles.id FK to auth.users(id) — we
  // create real auth users (email_confirm=true) so the FK is satisfied.
  const syntheticProfiles = [];
  for (let i = 0; i < 15; i++) {
    const email = `lead.synth.${i.toString().padStart(2, '0')}@example.com`;
    const fullName = `لقاء تجريبي رقم ${i + 1}`;
    const role = i % 2 === 0 ? 'client' : 'supplier';
    let uid = await findAuthUserId(email);
    if (!uid) {
      const { data, error } = await sb.auth.admin.createUser({
        email,
        password: 'SyntheticLead2026!',
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });
      if (error) throw new Error(`synthetic auth user ${email}: ${error.message}`);
      uid = data.user.id;
      // Insert the matching profile row.
      const { error: pe } = await sb.from('profiles').insert({
        id: uid,
        role,
        full_name: fullName,
        preferred_language: 'ar',
      });
      if (pe) throw new Error(`synthetic profile ${email}: ${pe.message}`);
    }
    syntheticProfiles.push({ id: uid, role });
  }
  // Build 20-lead list: 3 hot, 8 warm, 9 cold.
  const allLeadUsers = [
    { id: clientId, role: 'client' },
    ...allSuppliers.slice(0, 4).map((s) => ({ id: s.ownerId, role: 'supplier' })),
    ...syntheticProfiles,
  ];
  // Build category assignment per spec: 3 hot, 8 warm, 9 cold.
  const leadCategorySchedule = [
    ...Array(3).fill('hot'),
    ...Array(8).fill('warm'),
    ...Array(9).fill('cold'),
  ];
  const leadRows = [];
  for (let i = 0; i < 20; i++) {
    const u = allLeadUsers[i];
    const category = leadCategorySchedule[i];
    const score =
      category === 'hot' ? 70 + ((i * 7) % 26) :
      category === 'warm' ? 40 + ((i * 5) % 30) :
      ((i * 3) % 40);
    // 5 leads have a previous_category different from current (transition arrow)
    const previous_category =
      i < 5 ? (category === 'hot' ? 'warm' : category === 'warm' ? 'cold' : null) : null;
    // First hot lead: cold→hot transition, no recent alert yet (demo trigger).
    const last_hot_alerted_at = i === 0 ? null : (category === 'hot' ? new Date(Date.now() - 14 * dayMs).toISOString() : null);
    const previousForTransition = i === 0 ? 'cold' : previous_category;
    leadRows.push({
      user_id: u.id,
      category,
      score,
      signals: {
        role: u.role,
        daysSinceSignup: 30 + ((i * 11) % 120),
        daysSinceLastActivity: category === 'hot' ? 1 + (i % 7) : category === 'warm' ? 8 + (i % 14) : 45 + (i % 60),
        rfqCount: u.role === 'client' ? (category === 'hot' ? 5 : category === 'warm' ? 2 : 0) : 0,
        proposalsSubmitted: u.role === 'supplier' ? (category === 'hot' ? 12 : category === 'warm' ? 4 : 0) : 0,
        projectsCompleted: category === 'hot' ? 2 : 0,
        totalGmvSar: category === 'hot' ? 180_000 + i * 5000 : 0,
      },
      narrative:
        category === 'hot'
          ? `[mock] ${u.role === 'client' ? 'عميل' : 'مورد'} نشط — يفتح RFQs أسبوعياً ولديه عقد مكتمل. أولوية اتصال.`
          : category === 'warm'
          ? `[mock] ${u.role === 'client' ? 'عميل' : 'مورد'} مهتم لكن لم يحوّل بعد. تابع خلال أسبوع.`
          : null, // cold = no narrative yet (admin can recompute)
      previous_category: previousForTransition,
      last_computed_at: new Date(Date.now() - (i % 3) * dayMs).toISOString(),
      last_hot_alerted_at,
    });
  }
  for (const row of leadRows) {
    const { error } = await sb
      .from('lead_scores')
      .upsert(row, { onConflict: 'user_id' });
    if (error) throw new Error(`lead_scores ${row.user_id}: ${error.message}`);
  }
  console.log(
    `  ✓ W2.5: 20 lead_scores (3 hot 🔥 / 8 warm 🟡 / 9 cold ❄), 15 synthetic profiles, 1 cold→hot transition awaiting alert`
  );

  // ── W2.6 Notifications variety (30 rows for ahmed) ──
  // Spread across 7 days, ~30% unread. Categories from V4.1
  // mapping: rfq / proposal / chat / payment / system.
  const notifBase = [
    // RFQ × 5
    { type: 'rfq_match', title: 'طلب جديد يطابق تخصصك', body: 'تم نشر RFQ-DEMO-1023 — تصميم جناح Q1.', daysAgo: 0 },
    { type: 'rfq_new', title: 'تذكير: تحديث RFQ-DEMO-0987', body: 'الموعد النهائي خلال 3 أيام.', daysAgo: 1 },
    { type: 'rfq_match', title: 'طلب جديد يطابق تخصصك', body: 'فعالية إطلاق منتج — الرياض.', daysAgo: 2 },
    { type: 'rfq_match', title: 'طلب جديد يطابق تخصصك', body: 'هدايا تذكارية — جدة.', daysAgo: 3 },
    { type: 'rfq_new', title: 'RFQ-DEMO-1001 منشور', body: 'طلبك مرئي الآن للموردين المعتمدين.', daysAgo: 5 },
    // Proposal × 5
    { type: 'proposal_received', title: 'عرض جديد على طلبك', body: 'تركي القحطاني قدّم عرضاً.', daysAgo: 0 },
    { type: 'proposal_received', title: 'عرض جديد على طلبك', body: 'رهف الحضرمي قدّمت عرضاً.', daysAgo: 1 },
    { type: 'proposal_shortlisted', title: 'تمّ ترشيح عرضك', body: 'العميل ترشّح عرضك على RFQ-DEMO-OPEN.', daysAgo: 2 },
    { type: 'proposal_accepted', title: 'مبروك! عرضك مقبول', body: 'العميل اختار عرضك على RFQ-DEMO-ESC.', daysAgo: 4 },
    { type: 'proposal_rejected', title: 'تم رفض عرضك', body: 'العميل اختار مورداً آخر على RFQ-DEMO-0987.', daysAgo: 6 },
    // Chat × 4
    { type: 'message', title: 'رسالة من تركي القحطاني', body: 'السلام عليكم، أحتاج توضيح حول مساحة الجناح.', daysAgo: 0 },
    { type: 'message', title: 'رسالة من رهف الحضرمي', body: 'تم تجهيز التصاميم المبدئية.', daysAgo: 1 },
    { type: 'message', title: 'رسالة من فهد الدوسري', body: 'متى يبدأ التنفيذ؟', daysAgo: 3 },
    { type: 'panic_button', title: '🚨 تصعيد', body: 'العميل صعّد محادثة RFQ-DEMO-0975.', daysAgo: 4 },
    // Payment × 4
    { type: 'escrow_deposit_required', title: 'مطلوب إيداع مبدئي', body: 'حوّل 24,000 ﷼ لبدء التنفيذ.', daysAgo: 0 },
    { type: 'escrow_received', title: 'تأكدنا استلام الإيداع', body: 'يمكنك بدء العمل على RFQ-DEMO-ESC.', daysAgo: 1 },
    { type: 'work_started', title: 'بدأ العمل على مشروعك', body: 'المورد بدأ التنفيذ.', daysAgo: 2 },
    { type: 'delivery_approved', title: 'تمّ اعتماد التسليم', body: 'الدفعة النهائية ستُحرّر بعد المراجعة.', daysAgo: 5 },
    // Agreement × 3
    { type: 'agreement_pending', title: 'الاتفاق ينتظر فهمك', body: 'اكتب فهمك لمشروع RFQ-DEMO-ESC.', daysAgo: 0 },
    { type: 'agreement_pending', title: 'الاتفاق ينتظر فهمك', body: 'فهم المورد جاهز للمراجعة.', daysAgo: 2 },
    { type: 'agreement_pending', title: 'الاتفاق ينتظر توقيعك', body: 'كلا الطرفين قدّم فهمه.', daysAgo: 4 },
    // System / dispute / review × 6 (review uses 'system' since enum doesn't have a review type)
    { type: 'panic_button', title: '🚨 تصعيد جديد', body: 'محادثة RFQ-DEMO-1023 صعّدها العميل.', daysAgo: 1 },
    { type: 'panic_button', title: '🚨 نزاع مفتوح', body: 'دخل Admin كطرف ثالث.', daysAgo: 3 },
    { type: 'system', title: 'تقييم جديد وصلك', body: 'العميل قيّمك بـ ٥ نجوم.', daysAgo: 0 },
    { type: 'system', title: 'تقييم جديد وصلك', body: 'العميل قيّمك بـ ٤ نجوم.', daysAgo: 2 },
    { type: 'system', title: 'صيانة ليلة الجمعة', body: 'المنصة ستكون في وضع الصيانة من ١-٣ صباحاً.', daysAgo: 1 },
    { type: 'system', title: 'تحديث سياسة الخصوصية', body: 'راجع التغييرات الجديدة في مركز حقوق البيانات.', daysAgo: 4 },
    { type: 'system', title: 'ميزة جديدة: لوحة الأداء', body: 'الموردون: راجعوا KPIs والإيرادات في صفحة واحدة.', daysAgo: 6 },
    // 2 extra to reach 30
    { type: 'proposal_received', title: 'عرض جديد على طلبك', body: 'فهد الدوسري قدّم عرضاً على RFQ-DEMO-1001.', daysAgo: 0 },
    { type: 'system', title: 'تذكير: PDPL', body: 'راجع تفضيلات الخصوصية إذا لزم.', daysAgo: 5 },
  ];
  const notifRows = notifBase.map((n, idx) => ({
    user_id: clientId,
    type: n.type,
    title: n.title,
    body: n.body,
    link: `${APP_URL}/ar/dashboard/notifications`,
    read_at: idx < 9 ? null : new Date(Date.now() - (n.daysAgo * dayMs + 3600_000)).toISOString(),
    created_at: new Date(Date.now() - n.daysAgo * dayMs).toISOString(),
  }));
  const { error: notifErr } = await sb.from('notifications').insert(notifRows);
  if (notifErr) throw new Error(`notifications: ${notifErr.message}`);
  console.log(`  ✓ W2.6: 30 notifications for ahmed (9 unread, 8-category spread)`);

  // ── W2.7 Notification preferences ──
  const prefsRows = [
    {
      user_id: clientId,
      email_disabled_types: [],
      in_app_disabled_types: [],
      quiet_hours_start: null,
      quiet_hours_end: null,
      digest_frequency: 'off',
      sound_enabled: true,
    },
    {
      user_id: baseSupplierOwnerId,
      email_disabled_types: [],
      in_app_disabled_types: [],
      quiet_hours_start: '22:00',
      quiet_hours_end: '08:00',
      digest_frequency: 'off',
      sound_enabled: true,
    },
  ];
  if (adminId) {
    prefsRows.push({
      user_id: adminId,
      email_disabled_types: ['message'],
      in_app_disabled_types: [],
      quiet_hours_start: null,
      quiet_hours_end: null,
      digest_frequency: 'daily',
      sound_enabled: false,
    });
  }
  for (const row of prefsRows) {
    const { error } = await sb
      .from('notification_preferences')
      .upsert(row, { onConflict: 'user_id' });
    if (error) throw new Error(`notification_preferences ${row.user_id}: ${error.message}`);
  }
  console.log(`  ✓ W2.7: ${prefsRows.length} notification_preferences rows`);

  // ── W2.8 Blog posts (3 new) ──
  const blogRows = [
    {
      slug: 'demo-w2-published',
      title_ar: 'كيف نقيس نجاح المعرض بالأرقام',
      title_en: 'How we measure exhibition success by the numbers',
      excerpt_ar: 'دليل عملي للمعارض السعودية على KPIs الحقيقية.',
      excerpt_en: 'Practical guide for Saudi exhibitions on real KPIs.',
      content_ar:
        '<h2>المقدمة</h2><p>قياس نجاح المعرض يبدأ من قبل أن تبدأ الفعالية.</p><p>في هذا المقال نستعرض ٧ مؤشرات أداء (KPIs) عملية.</p>',
      content_en:
        '<h2>Introduction</h2><p>Measuring exhibition success starts before the event begins.</p>',
      cover_image:
        'https://placehold.co/1200x630/0E3B43/FAF8F4.png?text=Elmaared+Blog',
      status: 'published',
      published_at: new Date(Date.now() - 3 * dayMs).toISOString(),
      tags: ['kpi', 'measurement', 'how-to'],
      seo_title_ar: 'قياس KPI المعرض — دليل ٢٠٢٦',
      seo_description_ar: '٧ مؤشرات يجب على كل منظم معرض في السعودية متابعتها.',
      reading_time_minutes: 7,
    },
    {
      slug: 'demo-w2-scheduled',
      title_ar: 'تجهيز LEAP 2027 — ٨ أسابيع من الآن',
      title_en: null,
      excerpt_ar: 'خطة عمل أسبوعية للمشاركة الناجحة.',
      excerpt_en: null,
      content_ar:
        '<p>LEAP يبدأ في فبراير. هذه خطة الأسابيع الثمانية القادمة.</p>',
      content_en: null,
      cover_image: null,
      status: 'scheduled',
      published_at: new Date(Date.now() + 1 * dayMs).toISOString(),
      tags: ['leap', 'planning'],
      reading_time_minutes: 5,
    },
    {
      slug: 'demo-w2-draft',
      title_ar: 'مسوّدة: ميزات Phase V الجديدة',
      title_en: null,
      excerpt_ar: null,
      excerpt_en: null,
      content_ar:
        '<p>مسوّدة قيد العمل — لن تظهر في المدوّنة العامة.</p>',
      content_en: null,
      cover_image: null,
      status: 'draft',
      published_at: null,
      tags: ['internal'],
      reading_time_minutes: 2,
    },
  ];
  for (const row of blogRows) {
    const { error } = await sb
      .from('blog_posts')
      .upsert(row, { onConflict: 'slug' });
    if (error) throw new Error(`blog_posts ${row.slug}: ${error.message}`);
  }
  console.log(`  ✓ W2.8: 3 blog posts (1 published, 1 scheduled, 1 draft)`);

  // ── W2.9 Supplier KPI history (m.supplier.test) ──
  // 30 proposals + 8 completed projects + 25 reviews over past 12 months.
  // The seed re-creates Ahmed's data on each run but ADDS to m.supplier's
  // KPI history (we wipe only Phase V demo rows tagged with the marker).
  // For simplicity: identify W2.9-seeded rows by description prefix
  // '[w2.9-mock]' so re-runs cleanly replace them.
  console.log('\n[W2.9] Seeding supplier KPI history for m.supplier.test:');

  // Wipe prior W2.9 rows.
  const { data: priorProps } = await sb
    .from('proposals')
    .select('id')
    .eq('supplier_id', baseSupplierId)
    .like('description', '[w2.9-mock]%');
  const priorPropIds = (priorProps ?? []).map((p) => p.id);
  if (priorPropIds.length > 0) {
    // Cascade: agreements → escrow_transactions → escrow_events / reviews.
    const { data: priorAgs } = await sb
      .from('agreements')
      .select('id')
      .in('proposal_id', priorPropIds);
    const priorAgIds = (priorAgs ?? []).map((a) => a.id);
    if (priorAgIds.length > 0) {
      const { data: priorEsc } = await sb
        .from('escrow_transactions')
        .select('id')
        .in('agreement_id', priorAgIds);
      const priorEscIds = (priorEsc ?? []).map((e) => e.id);
      if (priorEscIds.length > 0) {
        await sb.from('escrow_events').delete().in('escrow_id', priorEscIds);
        await sb.from('escrow_transactions').delete().in('id', priorEscIds);
      }
      await sb.from('reviews').delete().in('agreement_id', priorAgIds);
      await sb.from('agreements').delete().in('id', priorAgIds);
    }
    await sb.from('proposals').delete().in('id', priorPropIds);
  }
  // Wipe prior W2.9-seeded RFQs too (we created the supplier's RFQ
  // history by inserting RFQs as the seeded synthetic clients).
  await sb.from('rfqs').delete().like('rfq_number', 'RFQ-W29-%');

  // 30 proposals across 12 months. Status distribution: 12 accepted /
  // 10 rejected / 6 withdrawn / 2 submitted. Category mix: 12 booth /
  // 8 event / 6 printing / 4 gifts.
  const categoryCycle = ['booth', 'booth', 'booth', 'event', 'printing', 'gifts'];
  const statusCycle = [
    ...Array(12).fill('accepted'),
    ...Array(10).fill('rejected'),
    ...Array(6).fill('withdrawn'),
    ...Array(2).fill('submitted'),
  ];
  // Use one synthetic client profile for KPI-history RFQs (re-uses
  // synth profile #0 which is a client).
  const kpiClientId = syntheticProfiles[0]?.id ?? clientId;
  // KPI RFQs need a company_id (rfqs.company_id is NOT NULL). Reuse
  // ahmed's company since admin client bypasses RLS.
  const kpiCompanyId = companyId;
  const acceptedCount = 12;
  const w29ProposalIds = []; // track for agreement/escrow creation
  for (let i = 0; i < 30; i++) {
    const monthOffset = Math.floor(i / 3); // ~3 per month
    const cat = categoryCycle[i % categoryCycle.length];
    const status = statusCycle[i];
    const createdAt = new Date(
      Date.now() - monthOffset * 30 * dayMs - (i % 30) * dayMs
    ).toISOString();
    // Each proposal needs its own RFQ (rfqs.id NOT NULL on proposals).
    const { data: rfq, error: rfqErr2 } = await sb
      .from('rfqs')
      .insert({
        rfq_number: `RFQ-W29-${i.toString().padStart(3, '0')}`,
        client_id: kpiClientId,
        company_id: kpiCompanyId,
        service_type: cat,
        title: `[w2.9-mock] طلب ${cat} ${i + 1}`,
        details: {},
        budget_min: 30000,
        budget_max: 250000,
        status: 'completed',
        created_at: createdAt,
      })
      .select('id')
      .single();
    if (rfqErr2) {
      console.warn(`    ⚠ RFQ-W29-${i}: ${rfqErr2.message}`);
      continue;
    }
    const { data: prop, error: propErr } = await sb
      .from('proposals')
      .insert({
        rfq_id: rfq.id,
        supplier_id: baseSupplierId,
        total_price: 30000 + (i * 7000) % 220000,
        delivery_days: 20 + (i % 30),
        description: `[w2.9-mock] عرض ${i + 1} على طلب ${cat}.`,
        status,
        created_at: createdAt,
      })
      .select('id')
      .single();
    if (propErr) {
      console.warn(`    ⚠ prop ${i}: ${propErr.message}`);
      continue;
    }
    if (status === 'accepted') w29ProposalIds.push({ id: prop.id, rfqId: rfq.id, createdAt });
  }
  console.log(`    ✓ 30 RFQ+proposal pairs (${w29ProposalIds.length} accepted)`);

  // 8 completed projects = first 8 accepted proposals + agreement + escrow.released
  const completionTarget = Math.min(8, w29ProposalIds.length);
  const completedAgList = []; // collect for the reviews loop below
  for (let i = 0; i < completionTarget; i++) {
    const { id: propId, rfqId, createdAt } = w29ProposalIds[i];
    // Need a client_id for the agreement — reuse kpiClientId.
    const { data: agreementRow, error: agErr } = await sb
      .from('agreements')
      .insert({
        rfq_id: rfqId,
        proposal_id: propId,
        client_id: kpiClientId,
        supplier_id: baseSupplierId,
        client_understanding: '[w2.9-mock] فهم العميل',
        supplier_understanding: '[w2.9-mock] فهم المورد',
        final_text: '[w2.9-mock] النص النهائي',
        status: 'signed',
        client_approved_at: createdAt,
        supplier_approved_at: createdAt,
      })
      .select('id')
      .single();
    if (agErr) {
      console.warn(`    ⚠ agreement ${i}: ${agErr.message}`);
      continue;
    }
    completedAgList.push({ id: agreementRow.id, rfqId, clientId: kpiClientId });
    // Realistic supplier_net 30k-250k.
    const supplierNet = 30000 + (i * 27000) % 220000;
    const releasedAt = new Date(
      Date.now() - (12 - i) * 30 * dayMs + (i % 7) * dayMs
    ).toISOString();
    await sb.from('escrow_transactions').insert({
      agreement_id: agreementRow.id,
      rfq_id: rfqId,
      total_amount: supplierNet + 2500,
      initial_deposit: supplierNet / 2,
      final_payment: supplierNet / 2,
      client_fee: 1250,
      supplier_fee: 1250,
      platform_revenue: 2500,
      supplier_net: supplierNet,
      vat_rate_applied: 0.15,
      client_fee_vat: 187.5,
      supplier_fee_vat: 187.5,
      total_vat: 375,
      status: 'released',
      initial_deposit_received_at: releasedAt,
      released_at: releasedAt,
    });
  }
  console.log(`    ✓ ${completionTarget} completed projects (released escrows)`);

  // Wipe prior W2.9 reviews to keep this section idempotent. The reviews
  // schema has no agreement_id column and stores text in `comment`
  // (UNIQUE on rfq_id — one review per RFQ).
  await sb
    .from('reviews')
    .delete()
    .eq('supplier_id', baseSupplierId)
    .like('comment', '[w2.9-mock]%');

  // 25 reviews spread across past 12 months, averaging ~4.6 stars.
  // Re-use the in-memory completedAgList rather than re-querying — the
  // LIKE filter on [w2.9-mock] was unreliable across PostgREST URL
  // encoding for square brackets. With only 8 completed agreements,
  // we cap reviews at 8 (one per project — realistic anyway).
  const reviewableAgList = completedAgList;
  const ratingPool = [5, 5, 5, 5, 4, 5, 4, 5, 5, 4, 5, 5, 4, 5, 5, 4, 4, 5, 5, 5, 4, 5, 5, 4, 5];
  let reviewsInserted = 0;
  for (let i = 0; i < Math.min(25, reviewableAgList.length); i++) {
    const ag = reviewableAgList[i];
    const rating = ratingPool[i];
    const { error: revErr } = await sb.from('reviews').insert({
      rfq_id: ag.rfqId,
      supplier_id: baseSupplierId,
      client_id: ag.clientId,
      rating_overall: rating,
      rating_quality: rating,
      rating_timeliness: Math.max(3, rating - 1),
      rating_communication: rating,
      rating_flexibility: rating,
      rating_price_value: Math.max(3, rating - 1),
      comment: `[w2.9-mock] مراجعة ${i + 1} — ${rating === 5 ? 'ممتاز' : 'جيد جداً'}.`,
      is_public: true,
      created_at: new Date(Date.now() - i * 14 * dayMs).toISOString(),
    });
    if (revErr) console.warn(`    ⚠ review ${i}: ${revErr.message}`);
    else reviewsInserted++;
  }
  console.log(`    ✓ ${reviewsInserted} reviews seeded (avg ~4.6 stars)`);

  console.log(
    `\n  ✓ W2 complete: 9 sections seeded for Phase V activation.`
  );

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
  // Phase V surfaces
  console.log('\n  Phase V (W2 seeded):');
  console.log(`  Notifications:    ${APP_URL}/ar/dashboard/notifications`);
  console.log(`  Notif prefs:      ${APP_URL}/ar/dashboard/notifications/preferences`);
  console.log(`  Risky clauses:    ${APP_URL}/ar/dashboard/rfqs/${rfqEsc.id}/agreement`);
  console.log(`  Supplier KPI:     ${APP_URL}/ar/supplier/dashboard       (login as m.supplier.test)`);
  console.log(`  Admin leads:      ${APP_URL}/admin/leads                  (login as sara.admin.test)`);
  console.log(`  Admin analytics:  ${APP_URL}/admin/analytics`);
  console.log(`  Admin blog:       ${APP_URL}/admin/blog`);
  console.log(`  Public blog:      ${APP_URL}/ar/blog`);
  console.log(`\n  Logins:`);
  console.log(`    ahmed.client.test@example.com / TestClient2026!`);
  console.log(`    m.supplier.test@example.com  / TestSupplier2026!`);
  console.log(`    sara.admin.test@example.com  / TestAdmin2026!`);
})().catch((err) => {
  console.error('FAIL:', err.message);
  process.exit(1);
});
