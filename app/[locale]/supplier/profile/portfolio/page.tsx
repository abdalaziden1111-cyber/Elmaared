import { Link } from '@/lib/i18n/routing';
import { requireRole } from '@/lib/auth/require-role';
import { createClient } from '@/lib/supabase/server';

interface SupplierProfile {
  id: string;
  company_name: string;
  legal_name: string | null;
  cr_number: string;
  vat_number: string | null;
  status: string;
  specializations: string[];
  cities: string[];
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

export default async function SupplierProfilePage() {
  const { user } = await requireRole(['supplier']);
  const supabase = await createClient();

  const { data: supplierRaw } = await supabase
    .from('suppliers')
    .select(
      'id, company_name, legal_name, cr_number, vat_number, status, specializations, cities, bio, website, team_size, years_of_experience, min_order_value, total_completed_orders, average_rating, on_time_delivery_rate, bank_name, iban, account_holder_name'
    )
    .eq('owner_id', user.id)
    .single();

  const s = supplierRaw as SupplierProfile | null;

  if (!s) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-[var(--color-midnight-green)]">ملفي</h1>
        <p className="mt-6 text-sm text-[var(--color-stone-600)]">
          لم نجد ملف المورد الخاص بك.
        </p>
      </div>
    );
  }

  // Defensive defaults — Supabase can return null for array columns even
  // though the schema declares them NOT NULL (RLS strips, race after migrations).
  const specializations = Array.isArray(s.specializations) ? s.specializations : [];
  const cities = Array.isArray(s.cities) ? s.cities : [];
  const completedOrders = s.total_completed_orders ?? 0;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-[var(--color-midnight-green)]">ملفي</h1>
          <span className="rounded-full bg-[var(--color-stone-100)] px-3 py-1 text-xs">
            {STATUS_LABEL[s.status] ?? s.status}
          </span>
        </div>
        <Link
          href="/supplier/profile/edit"
          className="inline-flex h-10 items-center rounded-xl bg-[var(--color-action-blue)] px-4 text-sm font-medium text-[var(--color-cream)] hover:bg-[var(--color-action-blue-700)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
        >
          تعديل الملف
        </Link>
      </div>
      <p className="mt-1 text-sm text-[var(--color-stone-600)]">
        البيانات المسجّلة. اضغط "تعديل" لتحديث أي قسم.
      </p>

      <section className="mt-6 rounded-2xl border border-[var(--color-stone-300)] bg-white p-5">
        <h2 className="text-base font-semibold text-[var(--color-midnight-green)]">
          المعلومات الأساسية
        </h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="اسم الشركة" value={s.company_name} />
          <Field label="الاسم القانوني" value={s.legal_name} />
          <Field label="رقم السجل التجاري" value={s.cr_number} mono />
          <Field label="رقم ضريبي" value={s.vat_number} mono />
          <Field
            label="سنوات الخبرة"
            value={s.years_of_experience != null ? `${s.years_of_experience} سنة` : null}
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
          نبذة وإحصاءات
        </h2>
        {s.bio ? (
          <p className="mt-3 whitespace-pre-line text-sm text-[var(--color-charcoal)]">
            {s.bio}
          </p>
        ) : (
          <p className="mt-3 text-sm text-[var(--color-stone-600)]">لم تضف نبذة بعد.</p>
        )}
        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
          <Field
            label="مشاريع منتهية"
            value={completedOrders.toString()}
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
                className="mt-1 block text-sm text-[var(--color-action-blue)]"
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
        <p className="mt-1 text-xs text-[var(--color-stone-600)]">
          المعلومات تُعرض جزئياً لأمانك. الـ IBAN كامل محفوظ ويُستخدم للتحويلات فقط.
        </p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="اسم البنك" value={s.bank_name} />
          <Field label="اسم صاحب الحساب" value={s.account_holder_name} />
          <Field label="IBAN" value={maskIban(s.iban)} mono />
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
