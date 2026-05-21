import { LayoutGrid } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/lib/i18n/routing';

export async function LandingFooter({ locale }: { locale: 'ar' | 'en' }) {
  const t = await getTranslations('landing.footer');
  const tMeta = await getTranslations('landing.meta');
  const brand = tMeta('title').split('—')[0].trim();

  const product: Array<{ key: string; href: string; pill?: 'new' | 'soon' }> = [
    { key: 'rfq', href: '/how-it-works' },
    { key: 'escrow', href: '/how-it-works', pill: 'new' },
    { key: 'admin', href: '/how-it-works' },
    { key: 'aiDocs', href: '/how-it-works' },
    { key: 'ceoEye', href: '/how-it-works', pill: 'soon' },
    { key: 'directory', href: '/discover' },
    { key: 'integrations', href: '/contact' },
    { key: 'api', href: '/contact', pill: 'soon' },
    { key: 'zatca', href: '/legal/terms' },
    { key: 'mobile', href: '/contact', pill: 'soon' },
    { key: 'changelog', href: '/blog' },
  ];

  const solutions: Array<{ key: string; href: string }> = [
    { key: 'tech', href: '/for-clients' },
    { key: 'government', href: '/for-clients' },
    { key: 'education', href: '/for-clients' },
    { key: 'realEstate', href: '/for-clients' },
    { key: 'retail', href: '/for-clients' },
    { key: 'finance', href: '/for-clients' },
  ];

  const company: Array<{ key: string; href: string; pill?: 'new' | 'hiring' }> = [
    { key: 'about', href: '/about' },
    { key: 'careers', href: '/contact', pill: 'hiring' },
    { key: 'press', href: '/contact' },
    { key: 'partners', href: '/contact' },
    { key: 'investors', href: '/contact' },
    { key: 'contact', href: '/contact' },
    { key: 'security', href: '/legal/privacy' },
    { key: 'trust', href: '/legal/terms' },
  ];

  const resources = ['blog', 'playbooks', 'caseStudies', 'rfqLibrary', 'helpCenter'];
  const community = ['events', 'ambassadors', 'suppliers', 'newsletter', 'discord'];

  return (
    <footer className="footer-wrap">
      <div className="footer-cut" aria-hidden />
      <div className="footer-watermark" aria-hidden>
        M
      </div>
      <div className="landing-wrap">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="l-logo">
              <span className="logo-mark" aria-hidden>
                <LayoutGrid className="size-[18px]" />
              </span>
              <span style={{ color: 'var(--landing-cream)' }}>{brand}</span>
            </div>
            <p>{t('tagline')}</p>
            <div className="footer-social">
              <a href="https://twitter.com" aria-label="X" rel="noreferrer noopener" target="_blank">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231L18.244 2.25Zm-1.16 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
                </svg>
              </a>
              <a href="https://linkedin.com" aria-label="LinkedIn" rel="noreferrer noopener" target="_blank">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286ZM5.337 7.433a2.062 2.062 0 1 1 0-4.125 2.062 2.062 0 0 1 0 4.125ZM7.114 20.452H3.559V9h3.555v11.452Z" />
                </svg>
              </a>
              <a href="https://instagram.com" aria-label="Instagram" rel="noreferrer noopener" target="_blank">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.71 3.71 0 0 1-1.38-.9 3.71 3.71 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16Zm0 1.95c-3.13 0-3.5.01-4.74.07-1.07.05-1.65.23-2.04.38-.51.2-.88.44-1.27.83-.39.39-.63.76-.83 1.27-.15.39-.33.97-.38 2.04-.06 1.24-.07 1.61-.07 4.74s.01 3.5.07 4.74c.05 1.07.23 1.65.38 2.04.2.51.44.88.83 1.27.39.39.76.63 1.27.83.39.15.97.33 2.04.38 1.24.06 1.61.07 4.74.07s3.5-.01 4.74-.07c1.07-.05 1.65-.23 2.04-.38.51-.2.88-.44 1.27-.83.39-.39.63-.76.83-1.27.15-.39.33-.97.38-2.04.06-1.24.07-1.61.07-4.74s-.01-3.5-.07-4.74c-.05-1.07-.23-1.65-.38-2.04a3.43 3.43 0 0 0-.83-1.27 3.43 3.43 0 0 0-1.27-.83c-.39-.15-.97-.33-2.04-.38-1.24-.06-1.61-.07-4.74-.07Zm0 3.32a4.57 4.57 0 1 1 0 9.14 4.57 4.57 0 0 1 0-9.14Zm0 7.54a2.97 2.97 0 1 0 0-5.94 2.97 2.97 0 0 0 0 5.94Zm5.83-7.74a1.07 1.07 0 1 1-2.14 0 1.07 1.07 0 0 1 2.14 0Z" />
                </svg>
              </a>
              <a href="https://youtube.com" aria-label="YouTube" rel="noreferrer noopener" target="_blank">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.546 12 3.546 12 3.546s-7.505 0-9.376.504A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136C4.495 20.454 12 20.454 12 20.454s7.505 0 9.376-.504a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814Zm-13.972 9.434V8.382L15.819 12l-6.293 3.62Z" />
                </svg>
              </a>
            </div>
          </div>

          <div className="footer-col">
            <h5>{t('productCol')}</h5>
            <ul>
              {product.map(({ key, href, pill }) => (
                <li key={key}>
                  <Link href={href}>
                    <span>{t(`product.${key}`)}</span>
                    {pill === 'new' && <span className="new-pill">{t('newPill')}</span>}
                    {pill === 'soon' && <span className="soon-pill">{t('soonPill')}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer-col">
            <h5>{t('solutionsCol')}</h5>
            <ul>
              {solutions.map(({ key, href }) => (
                <li key={key}>
                  <Link href={href}>{t(`solutions.${key}`)}</Link>
                </li>
              ))}
            </ul>
            <h5 className="mt-7">{t('resourcesCol')}</h5>
            <ul>
              {resources.map((key) => (
                <li key={key}>
                  <Link href={key === 'blog' ? '/blog' : '/contact'}>
                    {t(`resources.${key}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer-col">
            <h5>{t('companyCol')}</h5>
            <ul>
              {company.map(({ key, href, pill }) => (
                <li key={key}>
                  <Link href={href}>
                    <span>{t(`company.${key}`)}</span>
                    {pill === 'hiring' && (
                      <span className="new-pill">{t('hiringPill')}</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
            <h5 className="mt-7">{t('communityCol')}</h5>
            <ul>
              {community.map((key) => (
                <li key={key}>
                  <Link href="/contact">{t(`community.${key}`)}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <div>{t('copyright')}</div>
          <div className="links">
            <Link href="/legal/terms">{t('terms')}</Link>
            <Link href="/legal/privacy">{t('privacy')}</Link>
            <span>{t('language')}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
