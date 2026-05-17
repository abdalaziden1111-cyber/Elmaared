import { LoadingWithTimeout } from '@/components/ui/loading-with-timeout';
import { StatCardsSkeleton } from '@/components/ui/page-skeletons';

export default function Loading() {
  return (
    <LoadingWithTimeout>
      <StatCardsSkeleton />
    </LoadingWithTimeout>
  );
}
