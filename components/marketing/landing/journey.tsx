import {
  Send,
  Inbox,
  Sparkles,
  MessageSquare,
  PenLine,
  Vault,
  PackageCheck,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/lib/i18n/routing';

export async function Journey({ locale }: { locale: 'ar' | 'en' }) {
  const t = await getTranslations('landing.journey');
  const Arrow = locale === 'ar' ? ArrowLeft : ArrowRight;

  const steps = [
    { i: 1, icon: Send, tone: '' },
    { i: 2, icon: Inbox, tone: 'lime' },
    { i: 3, icon: Sparkles, tone: '' },
    { i: 4, icon: MessageSquare, tone: 'dark' },
    { i: 5, icon: PenLine, tone: '' },
    { i: 6, icon: Vault, tone: 'lime' },
    { i: 7, icon: PackageCheck, tone: 'dark' },
  ] as const;

  return (
    <section id="how" className="landing-section">
      <div className="landing-wrap">
        <div className="mb-10 max-w-3xl">
          <span className="eyebrow">
            <span className="dot" />
            {t('eyebrow')}
          </span>
          <h2 className="mt-5">{t('headline')}</h2>
          <p className="lead mt-4">{t('sub')}</p>
        </div>

        <div className="journey-rail reveal">
          {steps.map(({ i, icon: Icon, tone }) => (
            <div className="journey-step" key={i}>
              <div className={`journey-badge ${tone}`}>
                <Icon className="size-6" />
                <span className="num">{i}</span>
              </div>
              <h4>{t(`step${i}Title` as 'step1Title')}</h4>
              <p>{t(`step${i}Body` as 'step1Body')}</p>
            </div>
          ))}

          <div className="journey-foot col-span-full">
            <div className="journey-foot-metrics">
              <div className="journey-metric">
                <span className="num" dir="ltr">{t('metric1Num')}</span>{' '}
                <span className="label">{t('metric1Label')}</span>
              </div>
              <div className="journey-metric">
                <span className="num" dir="ltr">{t('metric2Num')}</span>{' '}
                <span className="label">{t('metric2Label')}</span>
              </div>
            </div>
            <Link href="/signup" className="l-btn l-btn-primary">
              <span>{t('cta')}</span>
              <Arrow className="size-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
