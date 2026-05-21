import { ArrowLeft, ArrowRight, Volume2 } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

export async function Industries({ locale }: { locale: 'ar' | 'en' }) {
  const t = await getTranslations('landing.industries');

  return (
    <section className="industries">
      <div className="landing-wrap">
        <div className="industries-header">
          <div className="reveal max-w-2xl">
            <span className="eyebrow">
              <span className="dot" />
              {t('eyebrow')}
            </span>
            <h2 className="mt-5">{t('headline')}</h2>
          </div>
          <div className="nav-arrows reveal d1" aria-hidden>
            <button type="button" className="nav-arrow">
              {locale === 'ar' ? (
                <ArrowRight className="size-4" />
              ) : (
                <ArrowLeft className="size-4" />
              )}
            </button>
            <button type="button" className="nav-arrow">
              {locale === 'ar' ? (
                <ArrowLeft className="size-4" />
              ) : (
                <ArrowRight className="size-4" />
              )}
            </button>
          </div>
        </div>

        <div className="industries-track reveal d2">
          {/* Tech — chat */}
          <article className="ind-card">
            <span className="ind-label num" dir="ltr">{t('techLabel')}</span>
            <h4>{t('techTitle')}</h4>
            <div className="visual">
              <div
                style={{
                  alignSelf: 'flex-start',
                  background: 'rgba(244,240,232,0.08)',
                  borderRadius: 12,
                  padding: '6px 10px',
                  fontSize: 12,
                }}
              >
                {t('techRow1')}
              </div>
              <div
                style={{
                  alignSelf: 'flex-end',
                  background: 'var(--landing-lime)',
                  color: 'var(--landing-green-900)',
                  borderRadius: 12,
                  padding: '6px 10px',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {t('techRow2')}
              </div>
            </div>
          </article>

          {/* Government — tasks */}
          <article className="ind-card">
            <span className="ind-label num" dir="ltr">{t('govLabel')}</span>
            <h4>{t('govTitle')}</h4>
            <div className="visual">
              <div className="row">
                <span>{t('govRow1')}</span>
                <span className="v num" dir="ltr">02/04</span>
              </div>
              <div className="row">
                <span>{t('govRow2')}</span>
                <span className="v num" dir="ltr">✓</span>
              </div>
            </div>
          </article>

          {/* Education — select */}
          <article className="ind-card">
            <span className="ind-label num" dir="ltr">{t('eduLabel')}</span>
            <h4>{t('eduTitle')}</h4>
            <div className="visual">
              <div
                className="row"
                style={{ background: 'rgba(200,255,102,0.14)', color: 'var(--landing-lime)' }}
              >
                <span>{t('eduRow1')}</span>
                <span className="v num" dir="ltr">▼</span>
              </div>
              <div className="row" style={{ opacity: 0.6 }}>
                <span>{t('eduRow2')}</span>
              </div>
            </div>
          </article>

          {/* Real-estate — metrics */}
          <article className="ind-card">
            <span className="ind-label num" dir="ltr">{t('realLabel')}</span>
            <h4>{t('realTitle')}</h4>
            <div className="visual">
              <div className="row">
                <span>{t('realRow1')}</span>
                <span className="v num" dir="ltr">+38%</span>
              </div>
              <div className="row">
                <span>{t('realRow2')}</span>
                <span className="v num" dir="ltr">+12</span>
              </div>
            </div>
          </article>

          {/* Retail — audio */}
          <article className="ind-card">
            <span className="ind-label num" dir="ltr">{t('retailLabel')}</span>
            <h4>{t('retailTitle')}</h4>
            <div className="visual" style={{ alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <Volume2 className="size-5" style={{ color: 'var(--landing-lime)' }} />
              <div className="audio-wave" aria-hidden>
                {[0.05, 0.18, 0.32, 0.5, 0.7, 0.45, 0.25, 0.6, 0.4].map((d, i) => (
                  <span key={i} style={{ animationDelay: `${d}s` }} />
                ))}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(244,240,232,0.6)' }}>
                {t('retailRow1')} · {t('retailRow2')}
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
