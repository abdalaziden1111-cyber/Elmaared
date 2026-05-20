#!/usr/bin/env node
// Phase V1.3 — Nightly lead-scoring batch.
//
// Walks every non-admin profile, recomputes the deterministic score (no AI
// narrative), upserts into `lead_scores`, and emails admins when a lead
// transitions to "hot" for the first time in 7 days (debounce window).
//
// Run:   pnpm score:leads
// Or:    node scripts/score-leads-nightly.mjs
//
// Side note: this script uses dynamic imports for the TS-only `lib/`
// modules via `tsx`. If you don't have tsx installed globally, run:
//   pnpm exec node --import tsx scripts/score-leads-nightly.mjs
// Or use the script-runner that ships with the project's dev tooling.

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

// --- env loader (matches scripts/seed-demo.mjs pattern) ---
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
for (const [k, v] of Object.entries(env)) {
  if (process.env[k] === undefined) process.env[k] = v;
}

const ALERT_DEBOUNCE_DAYS = 7;
const APP_URL = env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

const sb = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

console.log('[lead-scoring] starting nightly run…');

// Find admin emails for the alert recipients
const { data: admins } = await sb
  .from('profiles')
  .select('id')
  .eq('role', 'admin');
const adminIds = (admins ?? []).map((a) => a.id);
const adminEmailLookups = await Promise.allSettled(
  adminIds.map((id) => sb.auth.admin.getUserById(id))
);
const adminEmails = adminEmailLookups
  .filter((r) => r.status === 'fulfilled')
  .map((r) => r.value.data?.user?.email)
  .filter((e) => typeof e === 'string');

console.log(`[lead-scoring] alert recipients: ${adminEmails.length} admin email(s)`);

// Pull all non-admin, non-deleted profiles
const { data: profiles } = await sb
  .from('profiles')
  .select('id, full_name, role')
  .neq('role', 'admin')
  .is('deleted_at', null);

const candidates = (profiles ?? []);
console.log(`[lead-scoring] scoring ${candidates.length} lead(s)…`);

// We can't import TypeScript from .mjs directly without a transpiler.
// To keep the script standalone, we re-implement the same deterministic
// scoring inline. Keep this in sync with lib/ai/score-lead.ts.

function scoreLeadDeterministic(signals) {
  if (signals.role === 'admin') return 0;
  let score = 0;
  if (signals.totalGmvSar > 0) score += 10;
  if (signals.totalGmvSar >= 50_000) score += 10;
  if (signals.totalGmvSar >= 200_000) score += 10;
  if (signals.totalGmvSar >= 500_000) score += 10;
  if (signals.projectsCompleted >= 1) score += 10;
  if (signals.escrowsFunded >= 1) score += 5;
  if (signals.agreementsSigned >= 1) score += 5;
  if (signals.proposalsAccepted >= 1 || signals.proposalsShortlisted >= 1)
    score += 5;
  if (signals.rfqCount >= 1 || signals.proposalsSubmitted >= 1) score += 5;
  if (signals.rfqCount >= 5 || signals.proposalsSubmitted >= 5) score += 5;
  if (signals.rfqCount >= 15 || signals.proposalsSubmitted >= 25) score += 5;
  const recency = signals.daysSinceLastActivity;
  if (recency === null || recency > 90) {
    /* no bonus */
  } else if (recency <= 7) score += 20;
  else if (recency <= 30) score += 12;
  else if (recency <= 90) score += 5;
  if (
    signals.daysSinceSignup >= 60 &&
    signals.rfqCount === 0 &&
    signals.proposalsSubmitted === 0
  ) {
    score = Math.max(0, score - 10);
  }
  return Math.min(100, Math.max(0, score));
}

function categorize(score) {
  if (score >= 70) return 'hot';
  if (score >= 40) return 'warm';
  return 'cold';
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const nowTs = Date.now();
const since30 = new Date(nowTs - 30 * MS_PER_DAY).toISOString();

function daysBetween(iso) {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.floor((nowTs - t) / MS_PER_DAY));
}

async function collectSignals(profile) {
  const daysSinceSignup = daysBetween(profile.created_at) ?? 0;

  const { data: rfqs } = await sb
    .from('rfqs')
    .select('created_at, status')
    .eq('client_id', profile.id);
  const rfqRows = rfqs ?? [];
  const rfqCount = rfqRows.length;
  const rfqsLast30Days = rfqRows.filter((r) => r.created_at >= since30).length;
  const lastRfqAt = rfqRows.length
    ? rfqRows.map((r) => r.created_at).sort().slice(-1)[0]
    : null;
  const daysSinceLastRfq = daysBetween(lastRfqAt);

  let proposalsSubmitted = 0;
  let proposalsShortlisted = 0;
  let proposalsAccepted = 0;
  let lastProposalAt = null;
  if (profile.role === 'supplier') {
    const { data: supRow } = await sb
      .from('suppliers')
      .select('id')
      .eq('owner_id', profile.id)
      .maybeSingle();
    const supplierId = supRow?.id;
    if (supplierId) {
      const { data: props } = await sb
        .from('proposals')
        .select('status, created_at')
        .eq('supplier_id', supplierId);
      const rows = props ?? [];
      proposalsSubmitted = rows.length;
      proposalsShortlisted = rows.filter(
        (p) => p.status === 'shortlisted' || p.status === 'accepted'
      ).length;
      proposalsAccepted = rows.filter((p) => p.status === 'accepted').length;
      lastProposalAt = rows.length
        ? rows.map((p) => p.created_at).sort().slice(-1)[0]
        : null;
    }
  }
  const daysSinceLastProposal = daysBetween(lastProposalAt);

  // Agreements signed (rough — count signed agreements for either party)
  let agreementsSigned = 0;
  if (profile.role === 'client') {
    const { data } = await sb
      .from('agreements')
      .select('id, rfq:rfqs!inner(client_id)')
      .eq('rfqs.client_id', profile.id)
      .eq('status', 'signed');
    agreementsSigned = (data ?? []).length;
  } else if (profile.role === 'supplier') {
    const { data } = await sb
      .from('agreements')
      .select('id, supplier:suppliers!inner(owner_id)')
      .eq('suppliers.owner_id', profile.id)
      .eq('status', 'signed');
    agreementsSigned = (data ?? []).length;
  }

  // Escrows funded (client only)
  let escrowsFunded = 0;
  if (profile.role === 'client') {
    const { data } = await sb
      .from('escrow_transactions')
      .select('id, rfq:rfqs!inner(client_id)')
      .eq('rfqs.client_id', profile.id)
      .in('status', ['work_in_progress', 'delivered', 'final_payment', 'released']);
    escrowsFunded = (data ?? []).length;
  }

  // GMV + project completion via released escrows on either side
  let releasedRows = [];
  if (profile.role === 'client') {
    const { data } = await sb
      .from('escrow_transactions')
      .select('total_amount, rfq:rfqs!inner(client_id)')
      .eq('status', 'released')
      .eq('rfqs.client_id', profile.id);
    releasedRows = data ?? [];
  } else if (profile.role === 'supplier') {
    const { data: supRow } = await sb
      .from('suppliers')
      .select('id')
      .eq('owner_id', profile.id)
      .maybeSingle();
    if (supRow?.id) {
      const { data } = await sb
        .from('escrow_transactions')
        .select('total_amount, agreement:agreements!inner(supplier_id)')
        .eq('status', 'released')
        .eq('agreements.supplier_id', supRow.id);
      releasedRows = data ?? [];
    }
  }
  const projectsCompleted = releasedRows.length;
  const totalGmvSar = releasedRows.reduce((acc, r) => {
    const n = typeof r.total_amount === 'string' ? Number(r.total_amount) : r.total_amount;
    return acc + (Number.isFinite(n) ? n : 0);
  }, 0);

  const candidates = [lastRfqAt, lastProposalAt].filter(Boolean);
  const lastActivityAt =
    candidates.length > 0 ? candidates.sort().slice(-1)[0] : profile.created_at;
  const daysSinceLastActivity = daysBetween(lastActivityAt);

  return {
    role: profile.role,
    daysSinceSignup,
    daysSinceLastRfq,
    daysSinceLastProposal,
    rfqCount,
    rfqsLast30Days,
    proposalsSubmitted,
    proposalsShortlisted,
    proposalsAccepted,
    agreementsSigned,
    escrowsFunded,
    projectsCompleted,
    totalGmvSar,
    daysSinceLastActivity,
  };
}

let scored = 0;
let transitionedToHot = 0;
let emailsSent = 0;

for (const profile of candidates) {
  const { data: rowExisting } = await sb
    .from('lead_scores')
    .select('category, last_hot_alerted_at')
    .eq('user_id', profile.id)
    .maybeSingle();

  // Need created_at on the profile to compute daysSinceSignup. Use the
  // signups table the auth schema exposes; profiles already has created_at.
  const { data: profileFull } = await sb
    .from('profiles')
    .select('id, full_name, role, created_at')
    .eq('id', profile.id)
    .single();

  const signals = await collectSignals(profileFull);
  const score = scoreLeadDeterministic(signals);
  const category = categorize(score);
  const previousCategory = rowExisting?.category ?? null;
  const transitioned = category === 'hot' && previousCategory !== 'hot';

  const { error } = await sb.from('lead_scores').upsert(
    {
      user_id: profile.id,
      category,
      score,
      signals,
      previous_category: previousCategory,
      last_computed_at: new Date(nowTs).toISOString(),
      last_hot_alerted_at: rowExisting?.last_hot_alerted_at ?? null,
    },
    { onConflict: 'user_id' }
  );
  if (error) {
    console.error(`[lead-scoring] upsert failed for ${profile.id}:`, error.message);
    continue;
  }
  scored += 1;

  if (transitioned) {
    transitionedToHot += 1;
    // Debounce: skip if we alerted in the last 7 days
    const lastAlerted = rowExisting?.last_hot_alerted_at
      ? new Date(rowExisting.last_hot_alerted_at).getTime()
      : 0;
    if (nowTs - lastAlerted < ALERT_DEBOUNCE_DAYS * MS_PER_DAY) continue;

    // Lookup the user's email + send admin alert
    const { data: userLookup } = await sb.auth.admin.getUserById(profile.id);
    const userEmail = userLookup?.user?.email ?? '—';

    const highlightSignals = [];
    if (signals.totalGmvSar > 0)
      highlightSignals.push(`إجمالي GMV: ${Math.round(signals.totalGmvSar).toLocaleString('en')} ﷼`);
    if (signals.rfqCount > 0) highlightSignals.push(`عدد RFQs: ${signals.rfqCount}`);
    if (signals.proposalsSubmitted > 0)
      highlightSignals.push(`عروض مقدّمة: ${signals.proposalsSubmitted}`);
    if (signals.projectsCompleted > 0)
      highlightSignals.push(`مشاريع مكتملة: ${signals.projectsCompleted}`);
    if (signals.daysSinceLastActivity !== null)
      highlightSignals.push(`آخر نشاط منذ ${signals.daysSinceLastActivity} يوم`);

    if (adminEmails.length > 0 && env.RESEND_API_KEY) {
      try {
        // Use the same email shape as the templates module via REST so the
        // .mjs script doesn't have to import TypeScript directly.
        const subject = `لقاء جديد ساخن 🔥 — ${profileFull.full_name} (${score}/100)`;
        const body = `
          <h1 style="font-size:20px;margin:0 0 12px 0;">لقاء انتقل للحالة الساخنة</h1>
          <p>${profileFull.full_name} (${profileFull.role === 'client' ? 'عميل' : 'مورد'}) — ${userEmail}</p>
          <p>الدرجة: ${score}/100. الفئة السابقة: ${previousCategory ?? 'جديد'}</p>
          <ul>${highlightSignals.map((s) => `<li>${s}</li>`).join('')}</ul>
          <p><a href="${APP_URL}/admin/leads">افتح لوحة اللقاءات ←</a></p>
        `;
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: `${env.RESEND_FROM_EMAIL ? `تطبيق المعارض <${env.RESEND_FROM_EMAIL}>` : 'noreply@app-exhibition.sa'}`,
            to: adminEmails,
            subject,
            html: `<html dir="rtl" lang="ar"><body style="font-family:system-ui,sans-serif;background:#FAF8F4;padding:24px;"><div style="max-width:560px;margin:0 auto;background:#F2EEE7;padding:24px;border-radius:12px;">${body}</div></body></html>`,
          }),
        });
        emailsSent += 1;
        // Record the debounce timestamp
        await sb
          .from('lead_scores')
          .update({ last_hot_alerted_at: new Date(nowTs).toISOString() })
          .eq('user_id', profile.id);
      } catch (err) {
        console.error('[lead-scoring] email send failed:', err?.message ?? err);
      }
    }
  }
}

console.log(
  `[lead-scoring] done — scored ${scored}, ${transitionedToHot} transitioned to hot, ${emailsSent} email(s) sent`
);
