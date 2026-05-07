// Action-level authorization matrix. Today most action-level checks are
// inlined ("if profile.role !== 'client' return error"); this module
// centralizes them so:
//   1. Adding a new action requires touching one file, not five
//   2. Tests cover the full role × action matrix at unit-test speed
//   3. Future role hierarchy changes (e.g. "ops_admin" subset of admin)
//      live in one switch statement
//
// This complements requireRole() (the route-level gate) — requireRole
// answers "can this user open this page?", canPerformAction answers
// "can this role do this specific thing?".

import type { Database } from '@/lib/supabase/types';

type UserRole = Database['public']['Enums']['user_role'];

// Every action a server-side handler might gate on. Keep this list
// conservative — adding a new action with TS catches missing cases.
export type AppAction =
  | 'rfq.create'
  | 'rfq.publish'
  | 'rfq.award'
  | 'rfq.cancel'
  | 'proposal.submit'
  | 'proposal.shortlist'
  | 'chat.send_message'
  | 'chat.raise_panic'
  | 'chat.admin_join'
  | 'agreement.submit_understanding'
  | 'agreement.sign'
  | 'escrow.upload_initial_receipt'
  | 'escrow.confirm_initial_deposit'
  | 'delivery.submit'
  | 'delivery.approve'
  | 'escrow.release_to_supplier'
  | 'review.submit'
  | 'dispute.open'
  | 'dispute.resolve'
  | 'supplier.approve'
  | 'supplier.reject';

const MATRIX: Record<AppAction, ReadonlyArray<UserRole>> = {
  // RFQs
  'rfq.create': ['client'],
  'rfq.publish': ['client'],
  'rfq.award': ['client'],
  'rfq.cancel': ['client', 'admin'],
  // Proposals
  'proposal.submit': ['supplier'],
  'proposal.shortlist': ['client'],
  // Chat
  'chat.send_message': ['client', 'supplier', 'admin'],
  'chat.raise_panic': ['client', 'supplier'],
  'chat.admin_join': ['admin'],
  // Agreement
  'agreement.submit_understanding': ['client', 'supplier'],
  'agreement.sign': ['client', 'supplier'],
  // Escrow
  'escrow.upload_initial_receipt': ['client'],
  'escrow.confirm_initial_deposit': ['admin'],
  'delivery.submit': ['supplier'],
  'delivery.approve': ['client', 'admin'],
  'escrow.release_to_supplier': ['admin'],
  // Reviews + disputes
  'review.submit': ['client'],
  'dispute.open': ['client', 'supplier'],
  'dispute.resolve': ['admin'],
  // Supplier admin
  'supplier.approve': ['admin'],
  'supplier.reject': ['admin'],
};

/**
 * Returns true when the role is permitted to perform the given action.
 * Unknown roles → false (fail closed). Unknown actions are rejected at
 * the type level — adding a new action without updating the matrix is a
 * compile error.
 */
export function canPerformAction(role: UserRole | null | undefined, action: AppAction): boolean {
  if (!role) return false;
  const allowed = MATRIX[action];
  if (!allowed) return false;
  return allowed.includes(role);
}

/** Returns the list of roles permitted for an action — useful for UI hints. */
export function rolesAllowedFor(action: AppAction): ReadonlyArray<UserRole> {
  return MATRIX[action] ?? [];
}

/** Returns the list of actions a role can perform — useful for menu rendering. */
export function actionsAllowedFor(role: UserRole): AppAction[] {
  const result: AppAction[] = [];
  for (const [action, roles] of Object.entries(MATRIX) as Array<
    [AppAction, ReadonlyArray<UserRole>]
  >) {
    if (roles.includes(role)) result.push(action);
  }
  return result;
}
