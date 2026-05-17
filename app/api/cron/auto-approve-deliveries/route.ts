import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Vercel Cron: invoked daily. Auto-approves deliveries that have been
// awaiting client review for ≥14 days without action.
export async function GET(request: Request) {
  // Cron auth: Vercel sends `Authorization: Bearer <CRON_SECRET>`
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const { data: oldDeliveriesRaw } = await admin
    .from('deliveries')
    .select('id, rfq_id')
    .is('client_approved', null)
    .lte('delivered_at', cutoff);
  const oldDeliveries = (oldDeliveriesRaw ?? []) as Array<{ id: string; rfq_id: string }>;

  if (oldDeliveries.length === 0) {
    return NextResponse.json({ approved: 0 });
  }

  const ids = oldDeliveries.map((d) => d.id);
  const rfqIds = oldDeliveries.map((d) => d.rfq_id);
  const now = new Date().toISOString();

  await admin
    .from('deliveries')
    .update({
      client_approved: true,
      client_approved_at: now,
      client_approval_notes: 'تم الاعتماد تلقائياً بعد 14 يوم بدون اعتراض.',
    })
    .in('id', ids);

  // MVP evidence-only mode: mirror approveDeliveryAction — close the project
  // directly instead of running the final-payment + admin-payout cycle.
  await admin
    .from('escrow_transactions')
    .update({ status: 'released' })
    .in('rfq_id', rfqIds);

  await admin
    .from('rfqs')
    .update({ status: 'completed' })
    .in('id', rfqIds);

  return NextResponse.json({ approved: ids.length });
}
