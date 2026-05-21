'use client';

import { ArrowLeft, ArrowRight, MessageSquare, Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/lib/i18n/routing';

export function Faq() {
  const t = useTranslations('landing.faq');
  const locale = useLocale();
  const Arrow = locale === 'ar' ? ArrowLeft : ArrowRight;
  const [open, setOpen] = useState<number | null>(0);
  const items = [1, 2, 3, 4, 5, 6] as const;

  return (
    <section id="faq" className="landing-section">
      <div className="landing-wrap">
        <div className="faq-grid">
          <aside className="faq-aside">
            <span className="eyebrow">
              <span className="dot" />
              {t('eyebrow')}
            </span>
            <h2 className="mt-5">{t('headline')}</h2>
            <p className="lead mt-4">{t('sub')}</p>
            <div className="faq-help-card">
              <h4>{t('helpTitle')}</h4>
              <p>{t('helpBody')}</p>
              <Link href="/contact" className="cta">
                <MessageSquare className="size-3.5" />
                <span>{t('helpCta')}</span>
                <Arrow className="size-3.5" />
              </Link>
            </div>
          </aside>

          <div className="faq-list">
            {items.map((i) => (
              <div key={i} className={`faq-item ${open === i ? 'is-open' : ''}`}>
                <button
                  type="button"
                  className="faq-q"
                  aria-expanded={open === i}
                  onClick={() => setOpen(open === i ? null : i)}
                >
                  <span>{t(`q${i}` as 'q1')}</span>
                  <span className="faq-icon">
                    <Plus className="size-3.5" />
                  </span>
                </button>
                <div className="faq-a">
                  <div className="faq-a-inner">{t(`a${i}` as 'a1')}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
