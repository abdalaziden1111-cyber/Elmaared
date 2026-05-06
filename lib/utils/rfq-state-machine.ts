import type { Database } from '@/lib/supabase/types';

type RfqStatus = Database['public']['Enums']['rfq_status'];
type UserRole = Database['public']['Enums']['user_role'];

interface Transition {
  from: RfqStatus;
  to: RfqStatus;
  allowedRoles: UserRole[];
}

const VALID_TRANSITIONS: Transition[] = [
  { from: 'draft', to: 'open', allowedRoles: ['client'] },
  { from: 'draft', to: 'cancelled', allowedRoles: ['client', 'admin'] },
  { from: 'open', to: 'negotiating', allowedRoles: ['client'] },
  { from: 'open', to: 'cancelled', allowedRoles: ['client', 'admin'] },
  { from: 'negotiating', to: 'awarded', allowedRoles: ['client'] },
  { from: 'negotiating', to: 'cancelled', allowedRoles: ['client', 'admin'] },
  { from: 'awarded', to: 'in_escrow', allowedRoles: ['admin'] },
  { from: 'awarded', to: 'disputed', allowedRoles: ['client', 'admin'] },
  { from: 'in_escrow', to: 'in_progress', allowedRoles: ['admin'] },
  { from: 'in_escrow', to: 'disputed', allowedRoles: ['client', 'admin'] },
  { from: 'in_progress', to: 'delivered', allowedRoles: ['supplier'] },
  { from: 'in_progress', to: 'disputed', allowedRoles: ['client', 'supplier', 'admin'] },
  { from: 'delivered', to: 'completed', allowedRoles: ['client', 'admin'] },
  { from: 'delivered', to: 'disputed', allowedRoles: ['client', 'admin'] },
  { from: 'disputed', to: 'in_progress', allowedRoles: ['admin'] },
  { from: 'disputed', to: 'completed', allowedRoles: ['admin'] },
  { from: 'disputed', to: 'cancelled', allowedRoles: ['admin'] },
];

export function canTransition(from: RfqStatus, to: RfqStatus, role: UserRole): boolean {
  return VALID_TRANSITIONS.some(
    (t) => t.from === from && t.to === to && t.allowedRoles.includes(role)
  );
}

export function getNextStatuses(current: RfqStatus, role: UserRole): RfqStatus[] {
  return VALID_TRANSITIONS
    .filter((t) => t.from === current && t.allowedRoles.includes(role))
    .map((t) => t.to);
}

export function isTerminalStatus(status: RfqStatus): boolean {
  return status === 'completed' || status === 'cancelled';
}
