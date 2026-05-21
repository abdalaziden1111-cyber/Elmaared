'use client';

import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useLayoutEffect, useRef, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/lib/i18n/routing';

export function Pricing() {
  const t = useTranslations('landing.pricing');
  const locale = useLocale();
  const Arrow = locale === 'ar' ? ArrowLeft : ArrowRight;
  const [tab, setTab] = useState<'smb' | 'ent'>('smb');
  const toggleRef = useRef<HTMLDivElement | null>(null);
  const smbBtn = useRef<HTMLButtonElement | null>(null);
  const entBtn = useRef<HTMLButtonElement | null>(null);
  const [indicator, setIndicator] = useState<{ x: number; w: number; rtl: boolean }>({
    x: 0,
    w: 0,
    rtl: locale === 'ar',
  });

  useLayoutEffect(() => {
    const measure = () => {
      const target = tab === 'smb' ? smbBtn.current : entBtn.current;
      const wrap = toggleRef.current;
      if (!target || !wrap) return;
      const r = target.getBoundingClientRect();
      const w = wrap.getBoundingClientRect();
      const isRtl = window.getComputedStyle(wrap).direction === 'rtl';
      const x = isRtl ? w.right - r.right : r.left - w.left;
      setIndicator({ x: x - 4, w: r.width, rtl: isRtl });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [tab, locale]);

  return (
    <section id="pricing" className="landing-section">
      <div className="landing-wrap">
        <div className="mb-10 max-w-3xl text-center mx-auto">
          <span className="eyebrow">
            <span className="dot" />
            {t('eyebrow')}
          </span>
          <h2 className="mt-5">{t('headline')}</h2>
          <p className="lead mt-4">{t('sub')}</p>
        </div>

        <div className="pricing-card reveal">
          <div className="flex justify-center">
            <div className="pricing-toggle" ref={toggleRef}>
              <span
                className="indicator"
                style={{
                  transform: `translateX(${indicator.rtl ? -indicator.x : indicator.x}px)`,
                  width: indicator.w,
                }}
              />
              <button
                ref={smbBtn}
                type="button"
                className={tab === 'smb' ? 'is-active' : ''}
                onClick={() => setTab('smb')}
              >
                {t('tabSmb')}
              </button>
              <button
                ref={entBtn}
                type="button"
                className={tab === 'ent' ? 'is-active' : ''}
                onClick={() => setTab('ent')}
              >
                {t('tabEnterprise')}
                <span className="save-chip">{t('saveChip')}</span>
              </button>
            </div>
          </div>

          <div className={`pricing-variant ${tab === 'smb' ? 'is-active' : ''}`}>
            <div className="pricing-grid mt-8">
              <div>
                <div className="pricing-num-tag num" dir="ltr">{t('smbTag')}</div>
                <div className="pricing-num">
                  <span className="num" dir="ltr">{t('smbNum')}</span>
                  <span className="unit num" dir="ltr">{t('smbUnit')}</span>
                </div>
                <p className="pricing-split">{t('smbSub')}</p>
                <p className="pricing-vs">
                  <s>{t('smbVs')}</s>
                </p>
                <div className="pricing-cta">
                  <Link href="/signup" className="l-btn l-btn-primary">
                    <span>{t('smbCta')}</span>
                    <Arrow className="size-4" />
                  </Link>
                  <Link href="/contact" className="l-btn l-btn-ghost">
                    {t('smbCtaGhost')}
                  </Link>
                </div>
              </div>
              <ul className="pricing-includes">
                {[1, 2, 3, 4, 5].map((i) => (
                  <li key={i}>
                    <span className="ck" aria-hidden>
                      <Check className="size-2.5" strokeWidth={3} />
                    </span>
                    <span>{t(`smbInclude${i}` as 'smbInclude1')}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className={`pricing-variant ${tab === 'ent' ? 'is-active' : ''}`}>
            <div className="pricing-grid mt-8">
              <div>
                <div className="pricing-num-tag num" dir="ltr">{t('entTag')}</div>
                <div className="pricing-num">
                  <span className="num" dir="ltr">{t('entNum')}</span>
                  <span className="unit num" dir="ltr">{t('entUnit')}</span>
                </div>
                <p className="pricing-split">{t('entSub')}</p>
                <p className="pricing-vs">
                  <s>{t('entVs')}</s>
                </p>
                <div className="pricing-cta">
                  <Link href="/contact" className="l-btn l-btn-primary">
                    <span>{t('entCta')}</span>
                    <Arrow className="size-4" />
                  </Link>
                  <Link href="/signup" className="l-btn l-btn-ghost">
                    {t('entCtaGhost')}
                  </Link>
                </div>
              </div>
              <ul className="pricing-includes">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <li key={i}>
                    <span className="ck" aria-hidden>
                      <Check className="size-2.5" strokeWidth={3} />
                    </span>
                    <span>{t(`entInclude${i}` as 'entInclude1')}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
