import { Building2, ShieldCheck, Sparkles, Wallet } from 'lucide-react';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/lib/i18n/routing';
import { LocaleToggle } from '@/components/marketing/locale-toggle';

export default async function AuthLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as 'ar' | 'en');
  const tHome = await getTranslations('home');
  const isAr = locale === 'ar';

  const valueProps = isAr
    ? [
        {
          icon: ShieldCheck,
          title: 'موردون معتمدون فقط',
          body: 'سجل تجاري + رقم ضريبي + سابقة أعمال — مراجعة قبل ظهور أي مورد.',
        },
        {
          icon: Sparkles,
          title: 'تقييم الذكاء الاصطناعي',
          body: 'نقيّم كل عرض على 5 محاور ونلخّص نقاط القوة والمخاطر بالعربية.',
        },
        {
          icon: Wallet,
          title: 'ضمان نقدي كامل',
          body: 'نقودك في حساب المنصة حتى تعتمد التسليم. لا دفع مسبق للمورد.',
        },
      ]
    : [
        {
          icon: ShieldCheck,
          title: 'Verified suppliers only',
          body: 'CR + VAT + track record — every supplier is reviewed before listing.',
        },
        {
          icon: Sparkles,
          title: 'AI proposal scoring',
          body: 'Every bid scored on 5 axes with Arabic strength + risk summaries.',
        },
        {
          icon: Wallet,
          title: 'Full payment escrow',
          body: 'Your money stays with the platform until you accept delivery.',
        },
      ];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-[var(--color-stone-300)] bg-[var(--color-cream)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link
            href="/"
            aria-label={tHome('title')}
            className="flex items-center gap-2 text-base font-semibold text-[var(--color-midnight-green)]"
          >
            <span
              aria-hidden
              className="inline-flex size-8 items-center justify-center rounded-lg bg-[var(--color-midnight-green)] text-[var(--color-cream)]"
            >
              <Building2 className="size-4" />
            </span>
            <span className="hidden sm:inline">{tHome('title')}</span>
          </Link>
          <LocaleToggle />
        </div>
      </header>
      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Value-prop panel — desktop only */}
        <aside
          className="hidden flex-col justify-center bg-[var(--color-midnight-green)] px-12 py-16 text-[var(--color-cream)] lg:flex lg:w-1/2"
          aria-label={isAr ? 'لماذا تطبيق المعارض' : 'Why this platform'}
        >
          <div className="mx-auto max-w-md">
            <span className="inline-block rounded-full bg-white/10 px-3 py-1 text-xs">
              {tHome('tagline')}
            </span>
            <h2 className="mt-6 text-3xl font-bold leading-tight">
              {tHome('title')}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--color-cream)]/80">
              {tHome('heroLead')}
            </p>
            <ul className="mt-10 space-y-6">
              {valueProps.map((p) => {
                const Icon = p.icon;
                return (
                  <li key={p.title} className="flex gap-3">
                    <span
                      aria-hidden
                      className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10"
                    >
                      <Icon className="size-5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{p.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-[var(--color-cream)]/80">
                        {p.body}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>
        {/* Form column */}
        <div className="flex flex-1 flex-col lg:w-1/2">{children}</div>
      </div>
    </div>
  );
}
