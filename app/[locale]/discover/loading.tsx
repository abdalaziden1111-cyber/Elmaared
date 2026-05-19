import { LoadingWithTimeout } from '@/components/ui/loading-with-timeout';
import { RfqListSkeleton } from '@/components/ui/page-skeletons';

// Sprint 6 S6.3 — page-level streaming for /discover. The page hits Supabase
// for the approved-suppliers list + facet counts, which can take a moment on
// cold loads. RfqListSkeleton mirrors the row layout closely enough that
// content swap-in is visually stable.
export default function Loading() {
  return (
    <LoadingWithTimeout>
      <RfqListSkeleton rows={8} />
    </LoadingWithTimeout>
  );
}
