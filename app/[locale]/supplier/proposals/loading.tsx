import { LoadingWithTimeout } from '@/components/ui/loading-with-timeout';
import { RfqListSkeleton } from '@/components/ui/page-skeletons';

// Sprint 6 S6.3 — page-level streaming for the supplier proposals list.
// Mirrors the RFQ-list shape so the shell paints early.
export default function Loading() {
  return (
    <LoadingWithTimeout>
      <RfqListSkeleton rows={6} />
    </LoadingWithTimeout>
  );
}
