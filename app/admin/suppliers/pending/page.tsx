import { createAdminClient } from '@/lib/supabase/admin';
import { ApproveRejectButtons } from './approve-reject-buttons';

interface PendingSupplier {
  id: string;
  owner_id: string;
  company_name: string;
  cr_number: string;
  specializations: string[];
  cities: string[];
  bio: string | null;
  iban: string | null;
  created_at: string;
}

export default async function AdminPendingSuppliersPage() {
  const admin = createAdminClient();

  const { data: rowsRaw } = await admin
    .from('suppliers')
    .select(
      'id, owner_id, company_name, cr_number, specializations, cities, bio, iban, created_at'
    )
    .eq('status', 'pending_review')
    .order('created_at', { ascending: false });

  const rows = (rowsRaw ?? []) as unknown as PendingSupplier[];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[var(--color-midnight-green)]">
        موردون قيد المراجعة ({rows.length})
      </h1>

      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-[var(--color-stone-600)]">
          لا يوجد موردون بانتظار المراجعة الآن.
        </p>
      ) : (
        <ul className="mt-6 grid gap-4">
          {rows.map((s) => (
            <li
              key={s.id}
              className="rounded-2xl border border-[var(--color-stone-300)] bg-white p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-[var(--color-charcoal)]">
                    {s.company_name}
                  </h2>
                  <div className="mt-1 text-xs text-[var(--color-stone-600)]">
                    سجل تجاري:{' '}
                    <span className="num font-medium">{s.cr_number}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                    {s.specializations.map((sp) => (
                      <span
                        key={sp}
                        className="rounded-full bg-[var(--color-stone-100)] px-2 py-0.5"
                      >
                        {sp}
                      </span>
                    ))}
                  </div>
                  <div className="mt-1 text-xs text-[var(--color-stone-600)]">
                    المدن: {s.cities.join('، ')}
                  </div>
                  {s.bio ? (
                    <p className="mt-3 text-sm text-[var(--color-charcoal)]/80">
                      {s.bio}
                    </p>
                  ) : null}
                </div>
                <ApproveRejectButtons supplierId={s.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
