import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/lib/i18n/routing';

export async function FinalCta({ locale }: { locale: 'ar' | 'en' }) {
  const t = await getTranslations('landing.finalCta');
  const Arrow = locale === 'ar' ? ArrowLeft : ArrowRight;
  return (
    <section id="cta" className="landing-section" style={{ paddingTop: 56 }}>
      <div className="landing-wrap">
        <div className="cta-final reveal">
          <h2>
            {t('headlineLine1')} <span className="lime">{t('headlineLine2')}</span>
          </h2>
          <p>{t('sub')}</p>
          <div className="hero-cta">
            <Link href="/signup" className="l-btn l-btn-lime">
              <span>{t('primary')}</span>
              <Arrow className="size-4" />
            </Link>
            <Link href="/contact" className="l-btn l-btn-ghost" style={{ color: '#F4F0E8', borderColor: 'rgba(244,240,232,0.2)' }}>
              <span>{t('secondary')}</span>
            </Link>
          </div>
          <div className="cta-trust">
            {['trust1', 'trust2', 'trust3', 'trust4'].map((k) => (
              <span key={k}>
                <Check className="ck size-3.5" />
                {t(k)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
