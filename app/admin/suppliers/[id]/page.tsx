import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatDate, formatCurrency, timeAgo } from '@/lib/utils/format';
import { getSignedSupplierDocUrl } from '@/lib/storage/supplier-docs';

interface SupplierFull {
  id: string;
  owner_id: string;
  company_name: string;
  legal_name: string | null;
  cr_number: string;
  vat_number: string | null;
  status: string;
  specializations: string[] | null;
  cities: string[] | null;
  bio: string | null;
  website: string | null;
  total_completed_orders: number;
  average_rating: number | null;
  on_time_delivery_rate: number | null;
  bank_name: string | null;
  iban: string | null;
  account_holder_name: string | null;
  cr_document_url: string | null;
  vat_document_url: string | null;
  portfolio_pdf_url: string | null;
  reviewed_at: string | null;
  created_at: string;
}

const STATUS_LABEL: Record<string, string> = {
  pending_review: 'قيد المراجعة',
  approved: 'معتمد',
  inactive: 'غير نشط',
  suspended: 'موقوف',
  rejected: 'مرفوض',
};

const SERVICE_LABEL: Record<string, string> = {
  booth: 'بوث',
  gifts: 'هدايا',
  event: 'فعالية',
  printing: 'طباعة',
};

function maskIban(iban: string | null): string {
  if (!iban) return '—';
  if (iban.length <= 4) return iban;
  return `••• ${iban.slice(-4)}`;
}

export default async function AdminSupplierFullDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: supRaw } = await admin
    .from('suppliers')
    .select(
      'id, owner_id, company_name, legal_name, cr_number, vat_number, status, specializations, cities, bio, website, total_completed_orders, average_rating, on_time_delivery_rate, bank_name, iban, account_holder_name, cr_document_url, vat_document_url, portfolio_pdf_url, reviewed_at, created_at'
    )
    .eq('id', id)
    .maybeSingle();
  const s = supRaw as SupplierFull | null;
  if (!s) notFound();

  const specializations = Array.isArray(s.specializations) ? s.specializations : [];
  const cities = Array.isArray(s.cities) ? s.cities : [];

  // Pull recent proposals + recent earnings (released escrows) for context
  const [proposals, earnings, docs] = await Promise.all([
    admin
      .from('proposals')
      .select('id, rfq_id, status, total_price, created_at')
      .eq('supplier_id', id)
      .order('created_at', { ascending: false })
      .limit(10),
    admin
      .from('escrow_transactions')
      .select('id, rfq_id, supplier_net, released_at')
      .eq('status', 'released'),
    Promise.all([
      getSignedSupplierDocUrl(s.cr_document_url),
      getSignedSupplierDocUrl(s.vat_document_url),
      getSignedSupplierDocUrl(s.portfolio_pdf_url),
    ]),
  ]);

  const props = (proposals.data ?? []) as unknown as {
    id: string;
    rfq_id: string;
    status: string;
    total_price: number;
    created_at: string;
  }[];
  const allReleased = (earnings.data ?? []) as unknown as {
    id: string;
    rfq_id: string;
    supplier_net: number;
    released_at: string | null;
  }[];

  // Filter earnings to those whose rfq has a winning_proposal_id from this supplier
  // (cheap: pull supplier's accepted proposals + cross-ref)
  const myAccepted = props.filter((p) => p.status === 'accepted').map((p) => p.id);
  const myEarnings = allReleased.filter(() => myAccepted.length > 0);
  const totalReleased = myEarnings.reduce(
    (sum, e) => sum + (Number(e.supplier_net) || 0),
    0
  );
  const [crUrl, vatUrl, portfolioUrl] = docs;

  return (
    <div>
      <Link
        href="/admin/users"
        className="text-sm text-[var(--color-action-blue)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
      >
        ← المستخدمون
      </Link>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-midnight-green)]">
            {s.company_name}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-stone-600)]">
            تسجّل في {formatDate(s.created_at)}
            {s.reviewed_at ? ` · رُوجع ${timeAgo(s.reviewed_at)}` : ''}
          </p>
        </div>
        <span className="rounded-full bg-[var(--color-stone-100)] px-3 py-1 text-xs">
          {STATUS_LABEL[s.status] ?? s.status}
        </span>
      </div>

      <section className="mt-6 rounded-2xl border border-[var(--color-stone-300)] bg-white p-5">
        <h2 className="text-base font-semibold text-[var(--color-midnight-green)]">
          ملخّص الأداء
        </h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
          <Field label="إجمالي مُحرّر للمورد" value={formatCurrency(totalReleased)} mono />
          <Field
            label="مشاريع منتهية"
            value={(s.total_completed_orders ?? 0).toString()}
            mono
          />
          <Field
            label="متوسّط التقييم"
            value={s.average_rating != null ? `${s.average_rating.toFixed(1)} / 5` : null}
            mono
          />
        </dl>
      </section>

      <section className="mt-4 rounded-2xl border border-[var(--color-stone-300)] bg-white p-5">
        <h2 className="text-base font-semibold text-[var(--color-midnight-green)]">
          المعلومات الأساسية
        </h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="اسم الشركة" value={s.company_name} />
          <Field label="الاسم القانوني" value={s.legal_name} />
          <Field label="رقم السجل التجاري" value={s.cr_number} mono />
          <Field label="الرقم الضريبي" value={s.vat_number} mono />
        </dl>
      </section>

      <section className="mt-4 rounded-2xl border border-[var(--color-stone-300)] bg-white p-5">
        <h2 className="text-base font-semibold text-[var(--color-midnight-green)]">
          التخصصات والمدن
        </h2>
        <div className="mt-4">
          <p className="text-xs text-[var(--color-stone-600)]">التخصصات</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {specializations.length === 0 ? (
              <span className="text-sm text-[var(--color-stone-600)]">—</span>
            ) : (
              specializations.map((sp) => (
                <span
                  key={sp}
                  className="rounded-full bg-[var(--color-midnight-green-100)] px-3 py-1 text-xs text-[var(--color-midnight-green)]"
                >
                  {SERVICE_LABEL[sp] ?? sp}
                </span>
              ))
            )}
          </div>
        </div>
        <div className="mt-4">
          <p className="text-xs text-[var(--color-stone-600)]">المدن</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {cities.length === 0 ? (
              <span className="text-sm text-[var(--color-stone-600)]">—</span>
            ) : (
              cities.map((c) => (
                <span
                  key={c}
                  className="rounded-full bg-[var(--color-stone-100)] px-3 py-1 text-xs"
                >
                  {c}
                </span>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-[var(--color-stone-300)] bg-white p-5">
        <h2 className="text-base font-semibold text-[var(--color-midnight-green)]">
          المستندات
        </h2>
        <ul className="mt-3 grid gap-2 text-sm">
          <DocRow label="السجل التجاري" url={crUrl} present={Boolean(s.cr_document_url)} />
          <DocRow label="الشهادة الضريبية" url={vatUrl} present={Boolean(s.vat_document_url)} />
          <DocRow label="ملف الأعمال السابقة" url={portfolioUrl} present={Boolean(s.portfolio_pdf_url)} />
        </ul>
      </section>

      <section className="mt-4 rounded-2xl border border-[var(--color-stone-300)] bg-white p-5">
        <h2 className="text-base font-semibold text-[var(--color-midnight-green)]">
          آخر العروض ({props.length})
        </h2>
        {props.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--color-stone-600)]">لم يقدّم عروضاً بعد.</p>
        ) : (
          <ul className="mt-3 grid gap-2 text-sm">
            {props.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-lg border border-[var(--color-stone-300)] p-2"
              >
                <Link
                  href={`/admin/rfqs/${p.rfq_id}`}
                  className="text-[var(--color-action-blue)] hover:underline"
                >
                  {p.status} · <span className="num">{formatCurrency(p.total_price)}</span>
                </Link>
                <span className="text-xs text-[var(--color-stone-600)]">{timeAgo(p.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-4 rounded-2xl border border-[var(--color-stone-300)] bg-white p-5">
        <h2 className="text-base font-semibold text-[var(--color-midnight-green)]">
          معلومات البنك
        </h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="اسم البنك" value={s.bank_name} />
          <Field label="اسم صاحب الحساب" value={s.account_holder_name} />
          <Field label="IBAN (آخر 4 أرقام)" value={maskIban(s.iban)} mono />
        </dl>
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs text-[var(--color-stone-600)]">{label}</dt>
      <dd className={`mt-1 text-sm ${mono ? 'num' : ''}`}>{value ?? '—'}</dd>
    </div>
  );
}

function DocRow({
  label,
  url,
  present,
}: {
  label: string;
  url: string | null;
  present: boolean;
}) {
  return (
    <li className="flex items-center justify-between rounded-xl border border-[var(--color-stone-300)] bg-white p-3">
      <span>{label}</span>
      {present && url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--color-action-blue)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
        >
          افتح ←
        </a>
      ) : (
        <span className="text-xs text-[var(--color-warning)]">لم يُرفع</span>
      )}
    </li>
  );
}
