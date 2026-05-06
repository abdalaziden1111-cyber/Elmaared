import { createAdminClient } from '@/lib/supabase/admin';
import { formatCurrency } from '@/lib/utils/format';
import { ConfirmDepositButton } from './confirm-deposit-button';

interface PendingTx {
  id: string;
  rfq_id: string;
  initial_deposit: number;
  initial_deposit_receipt_url: string;
  initial_deposit_received_at: string;
}

export default async function AdminPendingDepositsPage() {
  const admin = createAdminClient();
  const { data: rowsRaw } = await admin
    .from('escrow_transactions')
    .select(
      'id, rfq_id, initial_deposit, initial_deposit_receipt_url, initial_deposit_received_at'
    )
    .eq('status', 'deposit_received')
    .order('initial_deposit_received_at', { ascending: true });

  const rows = (rowsRaw ?? []) as unknown as PendingTx[];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[var(--color-midnight-green)]">
        إيداعات بانتظار التأكيد ({rows.length})
      </h1>

      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-[var(--color-stone-600)]">لا يوجد إيداعات معلّقة.</p>
      ) : (
        <ul className="mt-6 grid gap-3">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between rounded-2xl border border-[var(--color-stone-300)] bg-white p-5"
            >
              <div className="text-sm">
                <div className="num">{formatCurrency(r.initial_deposit)}</div>
                <a
                  href={r.initial_deposit_receipt_url}
                  target="_blank"
                  rel="noopener"
                  className="mt-1 block text-xs text-[var(--color-action-blue)]"
                >
                  افتح الإيصال ←
                </a>
              </div>
              <ConfirmDepositButton escrowId={r.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
