import { getTranslations } from 'next-intl/server';
import { LoadingWithTimeout } from '@/components/ui/loading-with-timeout';
import { CompareSkeleton } from '@/components/ui/page-skeletons';

// Plan v2 §14.3 — contextual loading copy. The user is waiting on offer
// comparison data; a warm, specific message beats "جارٍ التحميل...".
export default async function Loading() {
  const t = await getTranslations('common.states');
  return (
    <LoadingWithTimeout>
      <p
        className="mb-4 text-sm text-[var(--color-stone-600)]"
        aria-live="polite"
      >
        {t('loadingProposals')}
      </p>
      <CompareSkeleton />
    </LoadingWithTimeout>
  );
}
