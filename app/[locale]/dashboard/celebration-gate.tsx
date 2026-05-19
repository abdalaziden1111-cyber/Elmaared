'use client';

import { useState } from 'react';
import { CelebrationModal } from '@/components/trust/celebration-modal';
import type { MilestoneType } from '@/lib/supabase/types';

/**
 * Client island for the dashboard's celebration trigger (Phase U4.3).
 *
 * The server component decides whether a milestone is ready to fire
 * (presence of qualifying state + absence of a `user_milestones` row).
 * If yes, it passes the milestone type here. This island opens the modal
 * on mount; the modal itself calls `claimMilestoneAction` inside its
 * effect so the row lands in the DB and the celebration doesn't repeat.
 */
export function CelebrationGate({ milestone }: { milestone: MilestoneType | null }) {
  // Initialize open state from the server-passed milestone. If null, the
  // gate renders nothing and the modal stays unmounted.
  const [open, setOpen] = useState(milestone !== null);

  if (!milestone) return null;

  return (
    <CelebrationModal
      open={open}
      milestone={milestone}
      onClose={() => setOpen(false)}
    />
  );
}
