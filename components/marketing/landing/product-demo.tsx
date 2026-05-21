'use client';

import {
  Home,
  FileText,
  Users,
  ScrollText,
  Shield,
  BarChart3,
  Settings,
  Sparkles,
  MessageSquare,
  Download,
  LayoutGrid,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';

export function ProductDemo() {
  const t = useTranslations('landing.product');
  const tRfqs = useTranslations('landing.product.rfqs');
  const locale = useLocale();
  const Arrow = locale === 'ar' ? ArrowLeft : ArrowRight;

  const [activeStep, setActiveStep] = useState(3); // index 0–6, 3 = "تفاوض"
  const steps = ['step1', 'step2', 'step3', 'step4', 'step5', 'step6', 'step7'] as const;
  const days = [1, 2, 3, 4, 6, 8, 18];

  const rows = [
    { key: 'row1Supplier', price: '87,500', duration: 18, rating: '4.8', win: true, av: 'إ' },
    { key: 'row2Supplier', price: '92,000', duration: 22, rating: '4.5', win: false, av: 'د' },
    { key: 'row3Supplier', price: '105,000', duration: 15, rating: '4.9', win: false, av: 'ط' },
    { key: 'row4Supplier', price: '110,000', duration: 20, rating: '4.6', win: false, av: 'ك' },
  ] as const;

  const sidebar: ReadonlyArray<{
    key: 'home' | 'rfqs' | 'suppliers' | 'agreements' | 'escrow' | 'reports' | 'settings';
    icon: typeof Home;
    badge?: string;
  }> = [
    { key: 'home', icon: Home },
    { key: 'rfqs', icon: FileText, badge: '3' },
    { key: 'suppliers', icon: Users },
    { key: 'agreements', icon: ScrollText },
    { key: 'escrow', icon: Shield },
    { key: 'reports', icon: BarChart3 },
    { key: 'settings', icon: Settings },
  ];

  return (
    <section id="product" className="landing-section product-section">
      <div className="landing-wrap">
        <div className="mb-10 max-w-3xl">
          <span className="eyebrow">
            <span className="dot" />
            {t('eyebrow')}
          </span>
          <h2 className="mt-5">{t('headline')}</h2>
        </div>

        <div className="pd-frame">
          <div className="pd-grid">
            {/* Sidebar */}
            <aside className="pd-side">
              <div className="pd-side-brand">
                <span className="logo-mark" aria-hidden>
                  <LayoutGrid className="size-3.5" />
                </span>
                <span>{useLocale() === 'ar' ? 'معرضي' : 'Maaridi'}</span>
              </div>
              <nav className="pd-side-nav">
                {sidebar.map(({ key, icon: Icon, badge }) => (
                  <button
                    key={key}
                    type="button"
                    className={`pd-side-item ${key === 'rfqs' ? 'is-active' : ''}`}
                  >
                    <Icon className="size-3.5" />
                    <span>{t(`sidebar.${key}`)}</span>
                    {badge ? <span className="badge num">{badge}</span> : null}
                  </button>
                ))}
              </nav>
              <div className="pd-side-admin">
                <h4>{t('sidebar.adminTitle')}</h4>
                <p>{t('sidebar.adminBody')}</p>
                <div className="who">
                  <span className="av" aria-hidden>ف</span>
                  <span>{t('sidebar.adminName')}</span>
                </div>
              </div>
            </aside>

            {/* Main */}
            <div className="pd-main">
              <div className="pd-toolbar">
                <div className="pd-crumb">
                  <span dir="ltr">{tRfqs('crumb')}</span>
                  <span className="pill">{tRfqs('statusPill')}</span>
                </div>
                <div className="pd-tool-actions">
                  <button type="button" className="pd-tool-btn">
                    <MessageSquare className="size-3.5" />
                    {tRfqs('chatBtn')}
                  </button>
                  <button type="button" className="pd-tool-btn">
                    <Download className="size-3.5" />
                    {tRfqs('exportBtn')}
                  </button>
                </div>
              </div>

              <div className="pd-banner">
                <div className="relative flex-1">
                  <div className="b-kicker">
                    <Sparkles className="size-3.5" />
                    <span>{tRfqs('bannerKicker')}</span>
                  </div>
                  <h3>{tRfqs('bannerTitle')}</h3>
                  <div className="b-meta">
                    <span>{tRfqs('bannerSavings')}</span>
                    <span>{tRfqs('bannerDelta')}</span>
                    <span>{tRfqs('bannerRating')}</span>
                  </div>
                </div>
                <button type="button" className="b-action">
                  {tRfqs('bannerAction')}
                  <Arrow className="ms-1 inline size-3.5" />
                </button>
                <span
                  className="hotspot"
                  style={{ top: 14, insetInlineEnd: 30 }}
                  aria-label={t('hotspot1Title')}
                >
                  <span className="tip">
                    <strong>{t('hotspot1Title')}</strong>
                    {t('hotspot1Body')}
                  </span>
                </span>
              </div>

              <div className="pd-compare">
                <div className="pd-compare-head">
                  <h4>{tRfqs('compareTitle')}</h4>
                  <p>{tRfqs('compareSub')}</p>
                </div>
                <table className="compare-table">
                  <thead>
                    <tr>
                      <th>{tRfqs('colSupplier')}</th>
                      <th>{tRfqs('colPrice')}</th>
                      <th>{tRfqs('colDuration')}</th>
                      <th>{tRfqs('colRating')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.key} className={`row ${r.win ? 'win' : ''}`}>
                        <td>
                          <span className="supplier">
                            <span className="av" aria-hidden>{r.av}</span>
                            <span>{tRfqs(r.key)}</span>
                            {r.win && <span className="winner-dot" aria-label="winner">✓</span>}
                          </span>
                        </td>
                        <td className="price num" dir="ltr">{r.price}</td>
                        <td className="num">
                          <span dir="ltr">{r.duration}</span> {tRfqs('dayUnit')}
                        </td>
                        <td className="rating num">{r.rating}★</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pd-timeline">
                <div className="pd-timeline-head">
                  <h4>{tRfqs('timelineTitle')}</h4>
                  <span className="pd-timeline-hint">{tRfqs('timelineHint')}</span>
                </div>
                <div className="pd-timeline-rail">
                  {steps.map((s, i) => {
                    const stateClass =
                      i < activeStep ? 'done' : i === activeStep ? 'now' : '';
                    return (
                      <button
                        key={s}
                        type="button"
                        className={`tl-step ${stateClass}`}
                        onClick={() => setActiveStep(i)}
                        aria-label={tRfqs(s)}
                        aria-current={i === activeStep ? 'step' : undefined}
                      >
                        <span className="dot num">{i + 1}</span>
                        <div className="label">{tRfqs(s)}</div>
                        <div className="day num" dir="ltr">
                          {tRfqs('dayLabel', { n: days[i] })}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
