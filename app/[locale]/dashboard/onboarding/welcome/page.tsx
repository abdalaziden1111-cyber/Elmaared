import { Link } from '@/lib/i18n/routing';
import { requireRole } from '@/lib/auth/require-role';

export default async function OnboardingWelcomePage() {
  await requireRole(['client']);

  const points = [
    {
      title: 'انشر طلباً واحداً',
      body: 'صف ما تريد بالعربية. سنوصله للموردين المناسبين تلقائياً.',
    },
    {
      title: 'استقبل عروضاً مقارنة',
      body: 'الذكاء الاصطناعي يقيّم كل عرض على 5 محاور موضوعية.',
    },
    {
      title: 'ادفع للضمان',
      body: 'نقودك في حساب المنصة حتى تعتمد التسليم.',
    },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <Stepper current={1} />

      <h1 className="mt-8 text-3xl font-semibold text-[var(--color-midnight-green)]">
        أهلاً بك في تطبيق المعارض
      </h1>
      <p className="mt-3 text-sm text-[var(--color-stone-600)]">
        ٣ دقائق لتفهم كيف تستفيد من المنصة قبل أن تنشر طلبك الأول.
      </p>

      <div className="mt-8 flex aspect-video items-center justify-center rounded-2xl border border-dashed border-[var(--color-stone-300)] bg-[var(--color-midnight-green-100)] text-sm text-[var(--color-midnight-green)]">
        <span>▶ فيديو تعريفي (٣٠ ثانية) — قريباً</span>
      </div>

      <ul className="mt-10 grid gap-4 sm:grid-cols-3">
        {points.map((p, i) => (
          <li
            key={p.title}
            className="rounded-2xl border border-[var(--color-stone-300)] bg-white p-5"
          >
            <span className="inline-flex size-8 items-center justify-center rounded-full bg-[var(--color-midnight-green)] text-xs font-semibold text-[var(--color-cream)]">
              {i + 1}
            </span>
            <h2 className="mt-3 text-sm font-semibold text-[var(--color-midnight-green)]">
              {p.title}
            </h2>
            <p className="mt-2 text-xs text-[var(--color-stone-600)]">{p.body}</p>
          </li>
        ))}
      </ul>

      <div className="mt-10 flex flex-wrap items-center justify-end gap-3">
        <Link
          href="/dashboard"
          className="inline-flex h-11 items-center rounded-xl border border-[var(--color-stone-300)] bg-white px-6 text-sm font-medium text-[var(--color-midnight-green)] hover:border-[var(--color-action-blue)]"
        >
          تخطّ
        </Link>
        <Link
          href="/dashboard/onboarding/exhibition"
          className="inline-flex h-11 items-center rounded-xl bg-[var(--color-action-blue)] px-6 text-sm font-semibold text-[var(--color-cream)] hover:bg-[var(--color-action-blue-700)]"
        >
          التالي ←
        </Link>
      </div>
    </div>
  );
}

export function Stepper({ current }: { current: 1 | 2 | 3 }) {
  const labels = ['الترحيب', 'المعرض', 'موردون مقترحون'];
  return (
    <ol className="flex items-center gap-2" aria-label="خطوات التهيئة">
      {labels.map((label, i) => {
        const idx = i + 1;
        const state: 'past' | 'current' | 'future' =
          idx < current ? 'past' : idx === current ? 'current' : 'future';
        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={
                'flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ' +
                (state === 'current'
                  ? 'bg-[var(--color-action-blue)] text-[var(--color-cream)]'
                  : state === 'past'
                  ? 'bg-[var(--color-success)] text-[var(--color-cream)]'
                  : 'bg-[var(--color-stone-100)] text-[var(--color-stone-600)]')
              }
              aria-current={state === 'current' ? 'step' : undefined}
            >
              {state === 'past' ? '✓' : idx}
            </span>
            <span
              className={
                'text-xs ' +
                (state === 'current'
                  ? 'font-medium text-[var(--color-charcoal)]'
                  : 'text-[var(--color-stone-600)]')
              }
            >
              {label}
            </span>
            {idx < 3 ? (
              <span
                className={
                  'h-px flex-1 ' +
                  (state === 'past'
                    ? 'bg-[var(--color-success)]'
                    : 'bg-[var(--color-stone-300)]')
                }
                aria-hidden
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
