import { LoadingWithTimeout } from '@/components/ui/loading-with-timeout';
import { RfqDetailSkeleton } from '@/components/ui/page-skeletons';

// Sprint 6 S6.3 — page-level streaming for /discover/[id]. The supplier
// profile is one of the heaviest reads: profile + portfolio (up to 12 items)
// + reviews + (optionally) trust signals. Stream the shell early so the
// breadcrumb + topbar paint instantly.
export default function Loading() {
  return (
    <LoadingWithTimeout>
      <RfqDetailSkeleton />
    </LoadingWithTimeout>
  );
}
