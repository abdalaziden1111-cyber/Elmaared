import { LoadingWithTimeout } from '@/components/ui/loading-with-timeout';
import { CompareSkeleton } from '@/components/ui/page-skeletons';

export default function Loading() {
  return (
    <LoadingWithTimeout>
      <CompareSkeleton />
    </LoadingWithTimeout>
  );
}
