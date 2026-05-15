import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatDate } from '@/lib/utils/format';
import { getSignedSupplierDocUrl } from '@/lib/storage/supplier-docs';
import { ApproveRejectButtons } from '../approve-reject-buttons';

interface SupplierDetail {
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
  team_size: number | null;
  years_of_experience: number | null;
  min_order_value: number | null;
  total_completed_orders: number;
  average_rating: number | null;
  on_time_delivery_rate: number | null;
  bank_name: string | null;
  iban: string | null;
  account_holder_name: string | null;
  cr_document_url: string | null;
  vat_document_url: string | null;
  portfolio_pdf_url: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
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

export default async function AdminSupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: supplierRaw } = await admin
    .from('suppliers')
    .select(
      'id, owner_id, company_name, legal_name, cr_number, vat_number, status, specializations, cities, bio, website, team_size, years_of_experience, min_order_value, total_completed_orders, average_rating, on_time_delivery_rate, bank_name, iban, account_holder_name, cr_document_url, vat_document_url, portfolio_pdf_url, reviewed_by, reviewed_at, review_notes, created_at'
    )
    .eq('id', id)
    .maybeSingle();
  const s = supplierRaw as SupplierDetail | null;
  if (!s) notFound();

  const specializations = Array.isArray(s.specializations) ? s.specializations : [];
  const cities = Array.isArray(s.cities) ? s.cities : [];

  const [crUrl, vatUrl, portfolioUrl] = await Promise.all([
    getSignedSupplierDocUrl(s.cr_document_url),
    getSignedSupplierDocUrl(s.vat_document_url),
    getSignedSupplierDocUrl(s.portfolio_pdf_url),
  ]);

  const canAct = s.status === 'pending_review';

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-midnight-green)]">
            {s.company_name}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-stone-600)]">
            تسجّل في {formatDate(s.created_at)}
          </p>
        </div>
        <span className="rounded-full bg-[var(--color-stone-100)] px-3 py-1 text-xs">
          {STATUS_LABEL[s.status] ?? s.status}
        </span>
      </div>

      <section className="mt-6 rounded-2xl border border-[var(--color-stone-300)] bg-white p-5">
        <h2 className="text-base font-semibold text-[var(--color-midnight-green)]">
          المعلومات الأساسية
        </h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="اسم الشركة" value={s.company_name} />
          <Field label="الاسم القانوني" value={s.legal_name} />
          <Field label="رقم السجل التجاري" value={s.cr_number} mono />
          <Field label="الرقم الضريبي" value={s.vat_number} mono />
          <Field
            label="سنوات الخبرة"
            value={
              s.years_of_experience != null ? `${s.years_of_experience} سنة` : null
            }
          />
          <Field
            label="حجم الفريق"
            value={s.team_size != null ? `${s.team_size} موظف` : null}
          />
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
        <ul className="mt-3 grid gap-2">
          <DocRow label="السجل التجاري" url={crUrl} present={Boolean(s.cr_document_url)} />
          <DocRow label="الشهادة الضريبية" url={vatUrl} present={Boolean(s.vat_document_url)} />
          <DocRow
            label="ملف الأعمال السابقة"
            url={portfolioUrl}
            present={Boolean(s.portfolio_pdf_url)}
          />
        </ul>
      </section>

      <section className="mt-4 rounded-2xl border border-[var(--color-stone-300)] bg-white p-5">
        <h2 className="text-base font-semibold text-[var(--color-midnight-green)]">
          نبذة وإحصاءات
        </h2>
        {s.bio ? (
          <p className="mt-3 whitespace-pre-line text-sm text-[var(--color-charcoal)]">
            {s.bio}
          </p>
        ) : (
          <p className="mt-3 text-sm text-[var(--color-stone-600)]">لم يضف نبذة.</p>
        )}
        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
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
          <Field
            label="نسبة التسليم في الوقت"
            value={
              s.on_time_delivery_rate != null
                ? `${Math.round(s.on_time_delivery_rate * 100)}%`
                : null
            }
            mono
          />
          {s.website ? (
            <div className="sm:col-span-3">
              <p className="text-xs text-[var(--color-stone-600)]">الموقع الإلكتروني</p>
              <a
                href={s.website}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 block text-sm text-[var(--color-action-blue)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
              >
                {s.website}
              </a>
            </div>
          ) : null}
        </dl>
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

      {s.reviewed_at ? (
        <section className="mt-4 rounded-2xl border border-[var(--color-stone-300)] bg-white p-5">
          <h2 className="text-base font-semibold text-[var(--color-midnight-green)]">
            سجل المراجعة
          </h2>
          <p className="mt-2 text-xs text-[var(--color-stone-600)]">
            آخر مراجعة: {formatDate(s.reviewed_at)}
          </p>
          {s.review_notes ? (
            <p className="mt-2 whitespace-pre-line text-sm text-[var(--color-charcoal)]">
              {s.review_notes}
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/suppliers/pending"
          className="text-sm text-[var(--color-action-blue)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
        >
          ← العودة للقائمة
        </Link>
        {canAct ? <ApproveRejectButtons supplierId={s.id} /> : null}
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
    <li className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-stone-300)] bg-white p-3 text-sm">
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
