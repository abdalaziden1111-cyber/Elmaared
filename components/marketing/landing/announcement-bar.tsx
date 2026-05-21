import { ArrowLeft, ArrowRight } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/lib/i18n/routing';

export async function AnnouncementBar({ locale }: { locale: 'ar' | 'en' }) {
  const t = await getTranslations('landing.announcement');
  const Arrow = locale === 'ar' ? ArrowLeft : ArrowRight;
  return (
    <>
      <div className="top-strip" aria-hidden />
      <div className="announce">
        <span className="chip">{t('chip')}</span>
        <span className="hide-sm">{t('tagline')}</span>
        <Link href="/blog">
          <span>{t('cta')}</span>
          <Arrow className="size-3.5" />
        </Link>
      </div>
    </>
  );
}
