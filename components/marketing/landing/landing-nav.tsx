'use client';

import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Sparkles,
  Shield,
  Cpu,
  GraduationCap,
  Building,
  Landmark,
  HeartPulse,
  ShoppingBag,
  Briefcase,
  Plane,
  Package,
  Gift,
  Megaphone,
  Printer,
  Users,
  Crown,
  HandHeart,
} from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/lib/i18n/routing';
import { LocaleToggle } from '../locale-toggle';

type MegaKey = 'product' | 'solutions' | null;

export function LandingNav() {
  const t = useTranslations('landing.nav');
  const tM = useTranslations('landing.mega');
  const tBrand = useTranslations('landing.meta');
  const [open, setOpen] = useState<MegaKey>(null);
  const [scrolled, setScrolled] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!navRef.current?.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  const industries = [
    { key: 'tech', icon: Cpu },
    { key: 'education', icon: GraduationCap },
    { key: 'realEstate', icon: Building },
    { key: 'finance', icon: Landmark },
    { key: 'health', icon: HeartPulse },
    { key: 'retail', icon: ShoppingBag },
    { key: 'government', icon: Briefcase },
    { key: 'travel', icon: Plane },
  ] as const;

  const useCases = [
    { key: 'booths', icon: Package },
    { key: 'gifts', icon: Gift },
    { key: 'events', icon: Megaphone },
    { key: 'print', icon: Printer },
  ] as const;

  return (
    <nav ref={navRef} className={`l-nav ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="landing-wrap">
        <div className="l-nav-inner">
          <Link href="/" className="l-logo">
            <span className="logo-mark" aria-hidden>
              <LayoutGrid className="size-[18px]" />
            </span>
            <span>{tBrand('title').split('—')[0].trim()}</span>
          </Link>

          <div className="l-nav-center">
            <button
              type="button"
              className={`l-nav-link ${open === 'product' ? 'is-active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(open === 'product' ? null : 'product');
              }}
              aria-expanded={open === 'product'}
            >
              {t('product')}
              <ChevronDown className="size-3" />
            </button>
            <button
              type="button"
              className={`l-nav-link ${open === 'solutions' ? 'is-active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(open === 'solutions' ? null : 'solutions');
              }}
              aria-expanded={open === 'solutions'}
            >
              {t('solutions')}
              <ChevronDown className="size-3" />
            </button>
            <Link href="/discover" className="l-nav-link">
              {t('customers')}
            </Link>
            <Link href="/blog" className="l-nav-link">
              {t('insights')}
            </Link>
            <Link href="/pricing" className="l-nav-link">
              {t('pricing')}
            </Link>
          </div>

          <div className="l-nav-cta">
            <LocaleToggle />
            <Link href="/login" className="l-btn-text">
              {t('signIn')}
            </Link>
            <Link href="/signup" className="l-nav-cta-btn">
              {t('requestDemo')}
            </Link>
          </div>
        </div>

        {/* Mega menus */}
        <div className={`mega ${open === 'product' ? 'is-open' : ''}`}>
          <div className="mega-grid">
            <div className="mega-col">
              <h5>{t('product')}</h5>
              <div className="mega-list">
                <Link href="/how-it-works" className="mega-item">
                  <span className="ic" aria-hidden>
                    <Sparkles className="size-3.5" />
                  </span>
                  <span>{tM('products.rfqTitle')}</span>
                </Link>
                <Link href="/how-it-works" className="mega-item">
                  <span className="ic" aria-hidden>
                    <Shield className="size-3.5" />
                  </span>
                  <span>{tM('products.escrowTitle')}</span>
                </Link>
              </div>
            </div>
            <aside className="mega-side">
              <div className="mega-org">
                <h6>
                  <span className="badge" aria-hidden>
                    <Sparkles className="size-3.5" />
                  </span>
                  {tM('products.rfqTitle')}
                </h6>
                <p>{tM('products.rfqBody')}</p>
              </div>
              <div className="mega-org">
                <h6>
                  <span className="badge" aria-hidden>
                    <Shield className="size-3.5" />
                  </span>
                  {tM('products.escrowTitle')}
                </h6>
                <p>{tM('products.escrowBody')}</p>
              </div>
            </aside>
          </div>
        </div>

        <div className={`mega ${open === 'solutions' ? 'is-open' : ''}`}>
          <div className="mega-grid">
            <div className="mega-col">
              <h5>{tM('solutions.industryTitle')}</h5>
              <div className="mega-list">
                {industries.map(({ key, icon: Icon }) => (
                  <Link
                    key={key}
                    href="/for-clients"
                    className="mega-item"
                  >
                    <span className="ic" aria-hidden>
                      <Icon className="size-3.5" />
                    </span>
                    <span>{tM(`solutions.industry.${key}`)}</span>
                  </Link>
                ))}
              </div>
              <h5 className="mt-4">{tM('solutions.useCaseTitle')}</h5>
              <div className="mega-list">
                {useCases.map(({ key, icon: Icon }) => (
                  <Link
                    key={key}
                    href="/for-clients"
                    className="mega-item"
                  >
                    <span className="ic" aria-hidden>
                      <Icon className="size-3.5" />
                    </span>
                    <span>{tM(`solutions.useCase.${key}`)}</span>
                  </Link>
                ))}
              </div>
            </div>
            <aside className="mega-side">
              <div className="mega-org">
                <h6>
                  <span className="badge" aria-hidden>
                    <Users className="size-3.5" />
                  </span>
                  {tM('solutions.size.smbTitle')}
                </h6>
                <p>{tM('solutions.size.smbBody')}</p>
              </div>
              <div className="mega-org">
                <h6>
                  <span className="badge" aria-hidden>
                    <Crown className="size-3.5" />
                  </span>
                  {tM('solutions.size.enterpriseTitle')}
                </h6>
                <p>{tM('solutions.size.enterpriseBody')}</p>
              </div>
              <div className="mega-org">
                <h6>
                  <span className="badge" aria-hidden>
                    <HandHeart className="size-3.5" />
                  </span>
                  {tM('solutions.size.nonprofitTitle')}
                </h6>
                <p>{tM('solutions.size.nonprofitBody')}</p>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </nav>
  );
}
