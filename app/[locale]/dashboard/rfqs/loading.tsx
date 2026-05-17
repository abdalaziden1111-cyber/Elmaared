import { LoadingWithTimeout } from '@/components/ui/loading-with-timeout';
import { RfqListSkeleton } from '@/components/ui/page-skeletons';

export default function Loading() {
  return (
    <LoadingWithTimeout>
      <RfqListSkeleton />
    </LoadingWithTimeout>
  );
}
