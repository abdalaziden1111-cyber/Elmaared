import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/lib/i18n/routing';

type SupplierCard = {
  name: string;
  sub: string;
  cities: string;
  deals: number | null;
  onTimePct: number;
  years: number | null;
  rating: number;
  mono: string;
};

export async function Suppliers({
  locale,
  suppliers,
}: {
  locale: 'ar' | 'en';
  suppliers: SupplierCard[];
}) {
  const t = await getTranslations('landing.suppliers');
  const Arrow = locale === 'ar' ? ArrowLeft : ArrowRight;

  const cards: SupplierCard[] =
    suppliers.length > 0
      ? suppliers.slice(0, 4)
      : [
          {
            name: t('fallbackCard1Name'),
            sub: t('fallbackCard1Cat'),
            cities: t('fallbackCard1City'),
            deals: 8,
            onTimePct: 98,
            years: 6,
            rating: 4.8,
            mono: 'I',
          },
          {
            name: t('fallbackCard2Name'),
            sub: t('fallbackCard2Cat'),
            cities: t('fallbackCard2City'),
            deals: 12,
            onTimePct: 95,
            years: 9,
            rating: 4.5,
            mono: 'D',
          },
          {
            name: t('fallbackCard3Name'),
            sub: t('fallbackCard3Cat'),
            cities: t('fallbackCard3City'),
            deals: 18,
            onTimePct: 99,
            years: 5,
            rating: 4.9,
            mono: 'T',
          },
          {
            name: t('fallbackCard4Name'),
            sub: t('fallbackCard4Cat'),
            cities: t('fallbackCard4City'),
            deals: 7,
            onTimePct: 93,
            years: 4,
            rating: 4.4,
            mono: 'L',
          },
        ];

  return (
    <section id="suppliers" className="landing-section" style={{ background: 'var(--landing-paper)', borderTop: '1px solid var(--landing-line)' }}>
      <div className="landing-wrap">
        <div className="industries-header" style={{ marginBottom: 32 }}>
          <div className="reveal max-w-2xl">
            <span className="eyebrow">
              <span className="dot" />
              {t('eyebrow')}
            </span>
            <h2 className="mt-5">{t('headline')}</h2>
            <p className="lead mt-4">{t('sub')}</p>
          </div>
          <Link href="/discover" className="l-btn l-btn-ghost reveal d1">
            <span>{t('browseAll')}</span>
            <Arrow className="size-4" />
          </Link>
        </div>

        <div className="sup-grid">
          {cards.map((c, i) => (
            <article key={`${c.name}-${i}`} className="sup-card reveal" style={{ transitionDelay: `${i * 0.05}s` }}>
              <div className="sup-cover">
                <span className="verified">
                  <span className="ck" aria-hidden>
                    <Check className="size-2.5" strokeWidth={3} />
                  </span>
                  {t('verifiedBadge')}
                </span>
                <span className="mono num" aria-hidden>{c.mono}</span>
              </div>
              <div className="sup-body">
                <h4>{c.name}</h4>
                <div className="sub">
                  {c.sub}
                  {c.cities ? ` · ${c.cities}` : ''}
                </div>
                <div className="sup-stats">
                  <div className="item">
                    <div className="num">{c.deals ?? '—'}</div>
                    <div className="lbl">{t('deals')}</div>
                  </div>
                  <div className="item">
                    <div className="num" dir="ltr">{c.onTimePct}%</div>
                    <div className="lbl">{t('onTime')}</div>
                  </div>
                  <div className="item">
                    <div className="num">{c.years ?? '—'}</div>
                    <div className="lbl">{t('years')}</div>
                  </div>
                </div>
                <div className="sup-foot">
                  <span className="rating num" dir="ltr">★ {c.rating.toFixed(1)}</span>
                  <Link href="/discover" className="view">
                    <span>{t('viewProfile')}</span>
                    <Arrow className="size-3.5" />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
