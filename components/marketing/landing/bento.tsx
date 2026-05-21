import {
  Wallet,
  Shield,
  Sparkles,
  AlertTriangle,
  FileText,
  Eye,
  Check,
  X,
} from 'lucide-react';
import { getTranslations } from 'next-intl/server';

export async function BentoValueProps() {
  const t = await getTranslations('landing.bento');
  return (
    <section id="features" className="landing-section">
      <div className="landing-wrap">
        <div className="reveal mb-12 text-center">
          <span className="eyebrow">
            <span className="dot" />
            {t('eyebrow')}
          </span>
          <h2 className="mt-5">{t('headline')}</h2>
        </div>

        <div className="bento">
          <div className="bento-card dark bento-hero">
            <div>
              <span className="ic" aria-hidden>
                <Wallet className="size-4" />
              </span>
              <h3>{t('commissionTitle')}</h3>
              <p>{t('commissionBody')}</p>
            </div>
            <div>
              <div className="hero-num num" dir="ltr">
                {t('commissionNum')}
              </div>
              <div className="hero-num-sub">{t('commissionNumSub')}</div>
            </div>
          </div>

          <div className="bento-card lime bento-small">
            <span className="ic" aria-hidden>
              <Shield className="size-4" />
            </span>
            <h3>{t('escrowTitle')}</h3>
            <p>{t('escrowBody')}</p>
          </div>

          <div className="bento-card bento-tall">
            <div>
              <span className="ic" aria-hidden>
                <Sparkles className="size-4" />
              </span>
              <h3>{t('aiCompareTitle')}</h3>
              <p>{t('aiCompareBody')}</p>
            </div>
            <div>
              <div className="bento-mini-row win">
                <span className="name">{t('aiCompareRow1')}</span>
                <span className="price num" dir="ltr">
                  {t('aiCompareRow1Price')} <small>﷼</small>
                </span>
              </div>
              <div className="bento-mini-row">
                <span className="name">{t('aiCompareRow2')}</span>
                <span className="price num" dir="ltr">
                  {t('aiCompareRow2Price')}
                </span>
              </div>
              <div className="bento-mini-row">
                <span className="name">{t('aiCompareRow3')}</span>
                <span className="price num" dir="ltr">
                  {t('aiCompareRow3Price')}
                </span>
              </div>
            </div>
          </div>

          <div className="bento-card bento-small">
            <span className="ic" aria-hidden>
              <AlertTriangle className="size-4" />
            </span>
            <h3>{t('panicTitle')}</h3>
            <p>{t('panicBody')}</p>
          </div>

          <div className="bento-card dark bento-wide">
            <div className="flex items-start gap-5">
              <span className="ic" aria-hidden>
                <FileText className="size-4" />
              </span>
              <div className="flex-1">
                <h3>{t('docTitle')}</h3>
                <p>{t('docBody')}</p>
              </div>
              <div className="hidden flex-col gap-2 sm:flex">
                <span
                  className="inline-flex items-center gap-2 rounded-full bg-[color-mix(in_oklab,white_12%,transparent)] px-3 py-1 text-xs"
                  style={{ color: '#C8FF66' }}
                >
                  <Check className="size-3" />
                  {t('docMatchedTag')}
                </span>
                <span
                  className="inline-flex items-center gap-2 rounded-full bg-[#5C1A22] px-3 py-1 text-xs"
                  style={{ color: '#FCA5A5' }}
                >
                  <X className="size-3" />
                  {t('docConflictTag')}
                </span>
              </div>
            </div>
          </div>

          <div className="bento-card dark bento-3wide">
            <div className="flex items-start gap-5">
              <span className="ic" aria-hidden>
                <Eye className="size-4" />
              </span>
              <div className="flex-1">
                <h3>{t('ceoTitle')}</h3>
                <p>{t('ceoBody')}</p>
              </div>
              <div className="bento-3stats">
                <div className="item">
                  <div className="num" dir="ltr">{t('ceoStat1Num')}</div>
                  <div className="label">{t('ceoStat1Label')}</div>
                </div>
                <div className="item">
                  <div className="num" dir="ltr">{t('ceoStat2Num')}</div>
                  <div className="label">{t('ceoStat2Label')}</div>
                </div>
                <div className="item">
                  <div className="num" dir="ltr">{t('ceoStat3Num')}</div>
                  <div className="label">{t('ceoStat3Label')}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
