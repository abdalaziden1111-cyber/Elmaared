import { LoadingWithTimeout } from '@/components/ui/loading-with-timeout';
import { RfqDetailSkeleton } from '@/components/ui/page-skeletons';

export default function Loading() {
  return (
    <LoadingWithTimeout>
      <RfqDetailSkeleton />
    </LoadingWithTimeout>
  );
}
