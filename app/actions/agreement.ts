'use server';

import { createHash } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { agreementUnderstandingSchema } from '@/schemas/agreement';
import { analyzeAgreement } from '@/lib/ai/analyze-agreement';
import { safeAfter } from '@/lib/utils/safe-after';
import { mapPostgresError } from '@/lib/utils/postgres-errors';
import { recordAudit } from '@/lib/audit/record';
import { buildNotification } from '@/lib/notifications/build';
import { maybeFireMilestone } from '@/lib/milestones/triggers';
import type { ActionResult } from './auth';

// Tamper-evident signature hash: SHA-256 over the canonical fields of the
// signing event. Stored alongside the *_approved_at timestamp so the
// agreement row provides non-repudiation evidence without a third-party
// PKI flow (sufficient for the MVP per legal review; can be replaced
// with a true e-signature provider later).
function computeSignatureHash(args: {
  agreementId: string;
  userId: string;
  role: 'client' | 'supplier';
  timestamp: string;
}): string {
  return createHash('sha256')
    .update(`${args.agreementId}|${args.userId}|${args.role}|${args.timestamp}`)
    .digest('hex');
}

export async function awardWinnerAction(
  proposalId: string
): Promise<ActionResult<{ agreementId: string }>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'يجب تسجيل الدخول.' };

  const admin = createAdminClient();

  const { data: proposalRowRaw } = await admin
    .from('proposals')
    .select('id, rfq_id, supplier_id, total_price, description, scope_of_work')
    .eq('id', proposalId)
    .single();
  const proposal = proposalRowRaw as
    | { id: string; rfq_id: string; supplier_id: string; total_price: number; description: string | null; scope_of_work: string | null }
    | null;
  if (!proposal) return { ok: false, error: 'لم نجد العرض.' };

  // Verify caller owns the RFQ
  const { data: rfqRowRaw } = await admin
    .from('rfqs')
    .select('id, client_id, status')
    .eq('id', proposal.rfq_id)
    .single();
  const rfq = rfqRowRaw as { id: string; client_id: string; status: string } | null;
  if (!rfq || rfq.client_id !== user.id) {
    return { ok: false, error: 'ليس لديك صلاحية على هذا الطلب.' };
  }

  // Mark winner accepted, others rejected
  await admin.from('proposals').update({ status: 'accepted' }).eq('id', proposal.id);
  await admin
    .from('proposals')
    .update({ status: 'rejected' })
    .eq('rfq_id', proposal.rfq_id)
    .neq('id', proposal.id)
    .in('status', ['submitted', 'under_review', 'shortlisted']);

  // Move RFQ to awarded + record winner
  await admin
    .from('rfqs')
    .update({
      status: 'awarded',
      winning_proposal_id: proposal.id,
      awarded_at: new Date().toISOString(),
    })
    .eq('id', proposal.rfq_id);

  // Archive non-winning chats
  await admin
    .from('chats')
    .update({ is_archived: true })
    .eq('rfq_id', proposal.rfq_id)
    .neq('supplier_id', proposal.supplier_id);

  // Create agreement
  const { data: agreementRowRaw, error: agErr } = await admin
    .from('agreements')
    .insert({
      rfq_id: proposal.rfq_id,
      proposal_id: proposal.id,
      client_id: user.id,
      supplier_id: proposal.supplier_id,
      status: 'pending',
    })
    .select('id')
    .single();
  const agreement = agreementRowRaw as { id: string } | null;
  if (agErr || !agreement) {
    const friendly = mapPostgresError(agErr, 'إنشاء الاتفاق');
    return { ok: false, error: friendly.messageAr };
  }

  await recordAudit(admin, {
    actorId: user.id,
    actorRole: 'client',
    action: 'rfq_awarded',
    resourceType: 'rfq',
    resourceId: proposal.rfq_id,
    metadata: { winning_proposal_id: proposal.id, agreement_id: agreement.id },
  });

  // Notify the winner. Look up the supplier's profile id (owner_id) and
  // the rfq_number for the message body.
  const { data: winnerRaw } = await admin
    .from('suppliers')
    .select('owner_id')
    .eq('id', proposal.supplier_id)
    .single();
  const winnerProfile = winnerRaw as { owner_id: string } | null;
  const { data: rfqMetaRaw } = await admin
    .from('rfqs')
    .select('rfq_number')
    .eq('id', proposal.rfq_id)
    .single();
  const rfqMeta = rfqMetaRaw as { rfq_number: string } | null;

  // Recipient's preferred locale, used to build a correctly-prefixed link.
  let winnerLocale: string | null = null;
  if (winnerProfile) {
    const { data: profRaw } = await admin
      .from('profiles')
      .select('preferred_language')
      .eq('id', winnerProfile.owner_id)
      .maybeSingle();
    winnerLocale = (profRaw as { preferred_language: string | null } | null)
      ?.preferred_language ?? null;
  }

  if (winnerProfile && rfqMeta) {
    const payload = buildNotification(
      {
        type: 'proposal_accepted',
        rfqNumber: rfqMeta.rfq_number,
        rfqId: proposal.rfq_id,
      },
      winnerLocale
    );
    await admin.from('notifications').insert({
      user_id: winnerProfile.owner_id,
      type: 'proposal_accepted',
      title: payload.title,
      body: payload.body,
      link: payload.link,
      rfq_id: proposal.rfq_id,
      proposal_id: proposal.id,
    });
  }

  revalidatePath(`/dashboard/rfqs/${proposal.rfq_id}`);
  return { ok: true, data: { agreementId: agreement.id } };
}

export async function submitUnderstandingAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const agreementId = String(formData.get('agreementId') ?? '');
  const text = String(formData.get('understanding') ?? '');

  const parsed = agreementUnderstandingSchema.safeParse({ understanding: text });
  if (!parsed.success) {
    return {
      ok: false,
      error: 'فهم الاتفاق يجب أن يكون 100 حرف على الأقل.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'يجب تسجيل الدخول.' };

  const { data: profileRaw } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  const profile = profileRaw as { role: 'client' | 'supplier' | 'admin' } | null;
  if (!profile) return { ok: false, error: 'لم نجد ملفك الشخصي.' };

  const admin = createAdminClient();
  const { data: agRowRaw } = await admin
    .from('agreements')
    .select(
      'id, client_id, supplier_id, client_understanding, supplier_understanding, rfq_id, proposal_id'
    )
    .eq('id', agreementId)
    .single();
  const ag = agRowRaw as
    | {
        id: string;
        client_id: string;
        supplier_id: string;
        client_understanding: string;
        supplier_understanding: string;
        rfq_id: string;
        proposal_id: string;
      }
    | null;
  if (!ag) return { ok: false, error: 'لم نجد الاتفاق.' };

  // Determine which side is submitting
  let isClient = false;
  let isSupplier = false;
  if (profile.role === 'client' && ag.client_id === user.id) isClient = true;
  else {
    const { data: supRowRaw } = await admin
      .from('suppliers')
      .select('id')
      .eq('owner_id', user.id)
      .single();
    const sup = supRowRaw as { id: string } | null;
    if (profile.role === 'supplier' && sup?.id === ag.supplier_id) isSupplier = true;
  }
  if (!isClient && !isSupplier) {
    return { ok: false, error: 'ليس لديك صلاحية على هذا الاتفاق.' };
  }

  // Persist understanding + revision
  const updateField = isClient
    ? { client_understanding: parsed.data.understanding, client_submitted_at: new Date().toISOString() }
    : { supplier_understanding: parsed.data.understanding, supplier_submitted_at: new Date().toISOString() };

  await admin.from('agreements').update(updateField).eq('id', ag.id);

  // Append revision (immutable trigger guards UPDATE/DELETE)
  const { data: latestRaw } = await admin
    .from('agreement_revisions')
    .select('revision_number')
    .eq('agreement_id', ag.id)
    .order('revision_number', { ascending: false })
    .limit(1)
    .maybeSingle();
  const latest = latestRaw as { revision_number: number } | null;
  const nextRevision = (latest?.revision_number ?? 0) + 1;

  await admin.from('agreement_revisions').insert({
    agreement_id: ag.id,
    revision_number: nextRevision,
    source: isClient ? 'client_understanding' : 'supplier_understanding',
    content: parsed.data.understanding,
    authored_by: user.id,
    authored_role: profile.role,
  });

  // Trigger AI analysis if both sides have submitted
  const updatedClient = isClient ? parsed.data.understanding : ag.client_understanding;
  const updatedSupplier = isSupplier ? parsed.data.understanding : ag.supplier_understanding;
  if (updatedClient && updatedClient.length >= 100 && updatedSupplier && updatedSupplier.length >= 100) {
    const { data: rfqRaw } = await admin
      .from('rfqs')
      .select('title')
      .eq('id', ag.rfq_id)
      .single();
    const { data: propRaw } = await admin
      .from('proposals')
      .select('description, scope_of_work, total_price, delivery_days')
      .eq('id', ag.proposal_id)
      .single();
    const rfq = rfqRaw as { title: string } | null;
    const prop = propRaw as
      | { description: string | null; scope_of_work: string | null; total_price: number; delivery_days: number }
      | null;

    if (rfq && prop) {
      safeAfter(
        'ai_analyze_agreement',
        () =>
          analyzeAgreement({
            agreementId: ag.id,
            rfqTitle: rfq.title,
            proposalSummary: `السعر ${prop.total_price.toLocaleString('en')} ﷼ — مدة التسليم ${prop.delivery_days} يوم. ${prop.description ?? ''}\n${prop.scope_of_work ?? ''}`,
            clientUnderstanding: updatedClient,
            supplierUnderstanding: updatedSupplier,
            // V1.1 — bill the user who triggered the final "both submitted"
            // condition. Either client or supplier works; both are bounded
            // by the same daily cap.
            userId: user.id,
          }),
        { agreement_id: ag.id }
      );
    }
  }

  revalidatePath(`/dashboard/rfqs/${ag.rfq_id}/agreement`);
  return { ok: true };
}

export async function signAgreementAction(agreementId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'يجب تسجيل الدخول.' };

  const { data: profileRaw } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  const profile = profileRaw as { role: 'client' | 'supplier' | 'admin' } | null;
  if (!profile) return { ok: false, error: 'لم نجد ملفك الشخصي.' };

  const admin = createAdminClient();
  const { data: agRowRaw } = await admin
    .from('agreements')
    .select('id, rfq_id, proposal_id, client_id, supplier_id, client_approved_at, supplier_approved_at')
    .eq('id', agreementId)
    .single();
  const ag = agRowRaw as
    | {
        id: string;
        rfq_id: string;
        proposal_id: string;
        client_id: string;
        supplier_id: string;
        client_approved_at: string | null;
        supplier_approved_at: string | null;
      }
    | null;
  if (!ag) return { ok: false, error: 'لم نجد الاتفاق.' };

  let isClient = false;
  let isSupplier = false;
  if (profile.role === 'client' && ag.client_id === user.id) isClient = true;
  else {
    const { data: supRowRaw } = await admin
      .from('suppliers')
      .select('id')
      .eq('owner_id', user.id)
      .single();
    const sup = supRowRaw as { id: string } | null;
    if (profile.role === 'supplier' && sup?.id === ag.supplier_id) isSupplier = true;
  }
  if (!isClient && !isSupplier) {
    return { ok: false, error: 'ليس لديك صلاحية على هذا الاتفاق.' };
  }

  const now = new Date().toISOString();
  const signatureHash = computeSignatureHash({
    agreementId: ag.id,
    userId: user.id,
    role: isClient ? 'client' : 'supplier',
    timestamp: now,
  });
  const update = isClient
    ? { client_approved_at: now, client_signature_hash: signatureHash }
    : { supplier_approved_at: now, supplier_signature_hash: signatureHash };
  await admin.from('agreements').update(update).eq('id', ag.id);

  const bothSigned = isClient
    ? Boolean(ag.supplier_approved_at)
    : Boolean(ag.client_approved_at);

  if (bothSigned) {
    await admin
      .from('agreements')
      .update({ status: 'signed' })
      .eq('id', ag.id);
    // MVP evidence-only mode: skip the in_escrow holding step.
    await admin
      .from('rfqs')
      .update({ status: 'in_progress' })
      .eq('id', ag.rfq_id);

    // V2.1 — celebrate the first signed agreement for both parties.
    // ag.client_id is auth.users.id (matches profiles.id). ag.supplier_id
    // is the suppliers.id — resolve to the owner profile id.
    safeAfter(
      'milestone_first_agreement_signed_client',
      () => maybeFireMilestone(ag.client_id, 'first_agreement_signed'),
      { user_id: ag.client_id, agreement_id: ag.id }
    );
    safeAfter(
      'milestone_first_agreement_signed_supplier',
      async () => {
        const { data: supRow } = await admin
          .from('suppliers')
          .select('owner_id')
          .eq('id', ag.supplier_id)
          .maybeSingle();
        const ownerId = (supRow as { owner_id: string } | null)?.owner_id;
        if (ownerId) await maybeFireMilestone(ownerId, 'first_agreement_signed');
      },
      { supplier_id: ag.supplier_id, agreement_id: ag.id }
    );

    // Defensively create the escrow_transactions row in the action itself,
    // mirroring the broadened evidence-only trigger. The trigger handles this
    // if it's been applied to the DB; this fallback insert keeps the flow
    // working even when only the base migration is present, which is the
    // case in this cloud environment. Idempotent via the rfq_id uniqueness
    // check below.
    const { data: existingEscrowRaw } = await admin
      .from('escrow_transactions')
      .select('id')
      .eq('rfq_id', ag.rfq_id)
      .maybeSingle();
    if (!existingEscrowRaw) {
      const { data: propRaw } = await admin
        .from('proposals')
        .select('total_price')
        .eq('id', ag.proposal_id)
        .maybeSingle();
      const prop = propRaw as { total_price: number } | null;
      if (prop) {
        const total = Number(prop.total_price);
        const clientFee = Math.round(total * 0.02 * 100) / 100;
        const supplierFee = Math.round(total * 0.03 * 100) / 100;
        const clientFeeVat = Math.round(clientFee * 0.15 * 100) / 100;
        const supplierFeeVat = Math.round(supplierFee * 0.15 * 100) / 100;
        const totalAmount = Math.round((total + clientFee + clientFeeVat) * 100) / 100;
        const initialDeposit = Math.round(totalAmount * 0.5 * 100) / 100;
        const finalPayment = Math.round((totalAmount - initialDeposit) * 100) / 100;
        await admin.from('escrow_transactions').insert({
          agreement_id: ag.id,
          rfq_id: ag.rfq_id,
          total_amount: totalAmount,
          initial_deposit: initialDeposit,
          final_payment: finalPayment,
          client_fee: clientFee,
          supplier_fee: supplierFee,
          platform_revenue: clientFee + supplierFee,
          supplier_net: total - supplierFee,
          vat_rate_applied: 0.15,
          client_fee_vat: clientFeeVat,
          supplier_fee_vat: supplierFeeVat,
          total_vat: clientFeeVat + supplierFeeVat,
          status: 'awaiting_deposit',
        });
      }
    }
  }

  revalidatePath(`/dashboard/rfqs/${ag.rfq_id}/agreement`);
  return { ok: true };
}
