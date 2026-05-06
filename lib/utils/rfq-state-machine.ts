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

const ALL_STATUSES: ReadonlySet<RfqStatus> = new Set([
  'draft', 'open', 'negotiating', 'awarded', 'in_escrow',
  'in_progress', 'delivered', 'completed', 'disputed', 'cancelled',
]);

const ALL_ROLES: ReadonlySet<UserRole> = new Set(['admin', 'client', 'supplier']);

function isKnownStatus(s: unknown): s is RfqStatus {
  return typeof s === 'string' && ALL_STATUSES.has(s as RfqStatus);
}

function isKnownRole(r: unknown): r is UserRole {
  return typeof r === 'string' && ALL_ROLES.has(r as UserRole);
}

/**
 * Returns true only if the from→to transition is in the allowlist *and* the
 * given role is permitted. Unknown statuses or roles are rejected — we never
 * fall through to "allowed by default".
 *
 * Same-state transitions (from === to) are explicitly disallowed because
 * they're a sign of buggy call-site logic, not a legitimate workflow step.
 */
export function canTransition(
  from: RfqStatus,
  to: RfqStatus,
  role: UserRole
): boolean {
  if (!isKnownStatus(from) || !isKnownStatus(to) || !isKnownRole(role)) {
    return false;
  }
  if (from === to) return false;
  return VALID_TRANSITIONS.some(
    (t) => t.from === from && t.to === to && t.allowedRoles.includes(role)
  );
}

export function getNextStatuses(current: RfqStatus, role: UserRole): RfqStatus[] {
  if (!isKnownStatus(current) || !isKnownRole(role)) return [];
  return VALID_TRANSITIONS
    .filter((t) => t.from === current && t.allowedRoles.includes(role))
    .map((t) => t.to);
}

/**
 * Terminal states have no outgoing transitions for any role. We treat any
 * status not in the known set as non-terminal so the caller is forced to
 * decide what to do with bad data, instead of silently treating unknowns
 * as "the workflow is done".
 */
export function isTerminalStatus(status: RfqStatus): boolean {
  if (!isKnownStatus(status)) return false;
  return status === 'completed' || status === 'cancelled';
}
