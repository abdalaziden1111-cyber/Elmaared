import { LoadingWithTimeout } from '@/components/ui/loading-with-timeout';
import { DashboardHomeSkeleton } from '@/components/ui/page-skeletons';

export default function Loading() {
  return (
    <LoadingWithTimeout>
      <DashboardHomeSkeleton />
    </LoadingWithTimeout>
  );
}
