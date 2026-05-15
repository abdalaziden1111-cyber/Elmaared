import { notFound } from 'next/navigation';
import { Star, ArrowRight, Briefcase } from 'lucide-react';
import { Link } from '@/lib/i18n/routing';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatDateShort } from '@/lib/utils/format';

interface SupplierProfile {
  id: string;
  company_name: string;
  bio: string | null;
  specializations: string[];
  cities: string[];
  website: string | null;
  years_of_experience: number | null;
  team_size: number | null;
  average_rating: number | null;
  total_completed_orders: number | null;
}

interface PortfolioRow {
  id: string;
  title: string;
  description: string | null;
  service_type: string | null;
  client_name: string | null;
  exhibition_name: string | null;
  year: number | null;
  cover_image_url: string | null;
  images: string[];
}

interface ReviewRowPublic {
  id: string;
  rating_overall: number;
  rating_quality: number | null;
  rating_timeliness: number | null;
  rating_communication: number | null;
  rating_flexibility: number | null;
  rating_price_value: number | null;
  comment: string | null;
  supplier_response: string | null;
  supplier_response_at: string | null;
  created_at: string;
  rfqs: { rfq_number: string; title: string } | null;
}

const SERVICE_LABEL: Record<string, string> = {
  booth: 'تصميم وتنفيذ أجنحة',
  gifts: 'هدايا ترويجية',
  event: 'تنظيم فعاليات',
  printing: 'مطبوعات',
};

const SUB_RATING_LABELS: { key: keyof Pick<ReviewRowPublic, 'rating_quality' | 'rating_timeliness' | 'rating_communication' | 'rating_flexibility' | 'rating_price_value'>; label: string }[] = [
  { key: 'rating_quality', label: 'الجودة' },
  { key: 'rating_timeliness', label: 'الالتزام بالموعد' },
  { key: 'rating_communication', label: 'التواصل' },
  { key: 'rating_flexibility', label: 'المرونة' },
  { key: 'rating_price_value', label: 'السعر مقابل القيمة' },
];

export default async function PublicSupplierProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: rowRaw } = await supabase
    .from('suppliers')
    .select(
      'id, company_name, bio, specializations, cities, website, years_of_experience, team_size, average_rating, total_completed_orders'
    )
    .eq('id', id)
    .eq('status', 'approved')
    .single();
  const s = rowRaw as unknown as SupplierProfile | null;
  if (!s) notFound();

  const admin = createAdminClient();

  const { data: portfolioRaw } = await admin
    .from('supplier_portfolio')
    .select(
      'id, title, description, service_type, client_name, exhibition_name, year, cover_image_url, images'
    )
    .eq('supplier_id', s.id)
    .order('display_order', { ascending: true })
    .limit(12);
  const portfolio = (portfolioRaw ?? []) as unknown as PortfolioRow[];

  const { data: reviewsRaw } = await admin
    .from('reviews')
    .select(
      'id, rating_overall, rating_quality, rating_timeliness, rating_communication, rating_flexibility, rating_price_value, comment, supplier_response, supplier_response_at, created_at, rfqs(rfq_number, title)'
    )
    .eq('supplier_id', s.id)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(20);
  const reviews = (reviewsRaw ?? []) as unknown as ReviewRowPublic[];

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Link
        href="/discover"
        className="text-xs font-medium text-[var(--color-action-blue)] hover:underline"
      >
        → كل الموردين
      </Link>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-[var(--color-midnight-green)]">
            {s.company_name}
          </h1>
          {s.bio ? (
            <p className="mt-3 max-w-2xl whitespace-pre-line text-sm text-[var(--color-charcoal)]/80">
              {s.bio}
            </p>
          ) : null}
        </div>
        <Link
          href="/dashboard/rfqs/new"
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--color-action-blue)] px-5 text-sm font-semibold text-[var(--color-cream)] hover:bg-[var(--color-action-blue-700)]"
        >
          <Briefcase className="size-4" aria-hidden />
          أنشئ طلباً لهذا المورد
        </Link>
      </header>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {s.average_rating ? (
          <Stat label="التقييم" value={`★ ${s.average_rating.toFixed(1)}`} />
        ) : (
          <Stat label="التقييم" value="جديد" />
        )}
        {s.total_completed_orders ? (
          <Stat label="مشاريع مكتملة" value={String(s.total_completed_orders)} />
        ) : null}
        {s.years_of_experience ? (
          <Stat label="سنوات خبرة" value={String(s.years_of_experience)} />
        ) : null}
        {s.team_size ? <Stat label="حجم الفريق" value={String(s.team_size)} /> : null}
      </div>

      <section className="mt-8">
        <h2 className="text-base font-semibold text-[var(--color-midnight-green)]">
          التخصصات
        </h2>
        <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
          {s.specializations.map((sp) => (
            <span key={sp} className="rounded-full bg-[var(--color-stone-100)] px-3 py-1">
              {SERVICE_LABEL[sp] ?? sp}
            </span>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-base font-semibold text-[var(--color-midnight-green)]">المدن</h2>
        <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
          {s.cities.map((c) => (
            <span key={c} className="rounded-full bg-[var(--color-stone-100)] px-3 py-1">
              {c}
            </span>
          ))}
        </div>
      </section>

      {s.website ? (
        <section className="mt-6 text-sm">
          <a
            href={s.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--color-action-blue)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
          >
            الموقع الإلكتروني ←
          </a>
        </section>
      ) : null}

      {/* Portfolio */}
      <section className="mt-10">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-xl font-semibold text-[var(--color-midnight-green)]">
            معرض الأعمال
          </h2>
          <span className="text-xs text-[var(--color-stone-600)] num">
            {portfolio.length} عمل
          </span>
        </div>

        {portfolio.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-[var(--color-stone-300)] p-6 text-center text-sm text-[var(--color-stone-600)]">
            لم يقم المورد بإضافة أعمال سابقة بعد.
          </p>
        ) : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {portfolio.map((p) => (
              <li
                key={p.id}
                className="overflow-hidden rounded-2xl border border-[var(--color-stone-300)] bg-white"
              >
                {p.cover_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.cover_image_url}
                    alt={p.title}
                    className="aspect-video w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-video w-full items-center justify-center bg-[var(--color-midnight-green-100)] text-xs text-[var(--color-midnight-green)]">
                    {p.service_type
                      ? SERVICE_LABEL[p.service_type] ?? p.service_type
                      : 'عمل سابق'}
                  </div>
                )}
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-[var(--color-midnight-green)]">
                    {p.title}
                  </h3>
                  <p className="mt-1 text-xs text-[var(--color-stone-600)]">
                    {[p.client_name, p.exhibition_name, p.year ? String(p.year) : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  {p.description ? (
                    <p className="mt-2 line-clamp-3 text-xs text-[var(--color-charcoal)]">
                      {p.description}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Reviews */}
      <section className="mt-10">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-xl font-semibold text-[var(--color-midnight-green)]">
            تقييمات العملاء
          </h2>
          <span className="text-xs text-[var(--color-stone-600)] num">
            {reviews.length} مراجعة
          </span>
        </div>

        {reviews.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-[var(--color-stone-300)] p-6 text-center text-sm text-[var(--color-stone-600)]">
            لا توجد تقييمات منشورة بعد. كل عميل يكمل مشروعاً يستطيع تقييم هذا المورد.
          </p>
        ) : (
          <ul className="mt-4 grid gap-3">
            {reviews.map((r) => (
              <li
                key={r.id}
                className="rounded-2xl border border-[var(--color-stone-300)] bg-white p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <Stars value={r.rating_overall} />
                  <span className="text-xs text-[var(--color-stone-600)] num">
                    {r.rfqs?.rfq_number ?? '—'} · {formatDateShort(r.created_at)}
                  </span>
                </div>
                {r.rfqs?.title ? (
                  <p className="mt-2 text-xs text-[var(--color-stone-600)]">
                    لمشروع: {r.rfqs.title}
                  </p>
                ) : null}
                {r.comment ? (
                  <p className="mt-3 whitespace-pre-line text-sm text-[var(--color-charcoal)]">
                    {r.comment}
                  </p>
                ) : null}
                {SUB_RATING_LABELS.some((sr) => r[sr.key] != null) ? (
                  <dl className="mt-3 grid gap-1 sm:grid-cols-2">
                    {SUB_RATING_LABELS.map((sr) =>
                      r[sr.key] != null ? (
                        <div
                          key={sr.key}
                          className="flex items-center justify-between gap-2 text-xs"
                        >
                          <dt className="text-[var(--color-stone-600)]">{sr.label}</dt>
                          <dd>
                            <Stars value={r[sr.key] as number} small />
                          </dd>
                        </div>
                      ) : null
                    )}
                  </dl>
                ) : null}
                {r.supplier_response ? (
                  <div className="mt-3 rounded-xl bg-[var(--color-stone-100)] p-3 text-xs">
                    <p className="font-medium text-[var(--color-stone-600)]">
                      رد المورد
                      {r.supplier_response_at
                        ? ` · ${formatDateShort(r.supplier_response_at)}`
                        : ''}
                    </p>
                    <p className="mt-1 whitespace-pre-line">{r.supplier_response}</p>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-12 rounded-2xl bg-[var(--color-midnight-green)] p-8 text-center text-[var(--color-cream)]">
        <h2 className="text-lg font-semibold">جاهز تبدأ معه؟</h2>
        <p className="mt-2 text-sm opacity-90">
          أنشئ طلب عرض الآن. كل الموردين المطابقين سيستلمون طلبك، وأنت تختار من بينهم بمساعدة AI.
        </p>
        <Link
          href="/dashboard/rfqs/new"
          className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--color-dune-gold)] px-6 text-sm font-semibold text-[var(--color-midnight-green)] hover:bg-[var(--color-dune-gold-100)]"
        >
          أنشئ طلب عرض
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--color-stone-300)] bg-white p-3">
      <div className="text-xs text-[var(--color-stone-600)]">{label}</div>
      <div className="mt-0.5 text-sm font-medium num">{value}</div>
    </div>
  );
}

function Stars({ value, small }: { value: number; small?: boolean }) {
  const size = small ? 'size-3' : 'size-4';
  return (
    <div className="flex items-center gap-0.5" aria-label={`${value} من 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`${size} ${
            n <= value
              ? 'fill-[var(--color-dune-gold)] text-[var(--color-dune-gold)]'
              : 'text-[var(--color-stone-300)]'
          }`}
          aria-hidden
        />
      ))}
    </div>
  );
}
