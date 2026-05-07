// Centralized audit-log writer. Every Server Action that mutates state
// should call recordAudit(...) so we have a single place to add fields
// (request IP, user agent, trace id) later without touching every action.
//
// We intentionally don't fail the parent action if the audit insert
// errors — the user shouldn't see "couldn't record audit" when their
// real operation succeeded. We log the failure for ops review.

import type { Database } from '@/lib/supabase/types';
import { log } from '@/lib/utils/logger';

type UserRole = Database['public']['Enums']['user_role'];

// Loose admin type so we accept either the real Supabase admin client
// (whose insert() returns a chainable PostgrestFilterBuilder, not a true
// Promise) or our test-mock equivalent. The runtime contract: the value
// returned by .insert(row) is awaitable and resolves to {error: ... | null}.
/* eslint-disable @typescript-eslint/no-explicit-any */
interface MinimalAdmin {
  from(table: 'audit_logs'): { insert(row: AuditInsert): any };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

interface AuditInsert {
  actor_id: string | null;
  actor_role: UserRole | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  metadata?: Record<string, unknown>;
  ip_address?: string | null;
  user_agent?: string | null;
}

export interface RecordAuditArgs {
  actorId: string | null;
  actorRole: UserRole | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Insert an audit row. Swallows errors (after logging) so a failed audit
 * doesn't break the user-visible action that triggered it. Returns true
 * when the insert reportedly succeeded.
 */
export async function recordAudit(
  admin: MinimalAdmin,
  args: RecordAuditArgs
): Promise<boolean> {
  if (!args.action || !args.resourceType) {
    log.warn('audit.invalid_input', {
      action: args.action,
      resourceType: args.resourceType,
    });
    return false;
  }

  const row: AuditInsert = {
    actor_id: args.actorId,
    actor_role: args.actorRole,
    action: args.action,
    resource_type: args.resourceType,
    resource_id: args.resourceId,
    metadata: args.metadata,
    ip_address: args.ipAddress ?? null,
    user_agent: args.userAgent ?? null,
  };

  try {
    const { error } = await admin.from('audit_logs').insert(row);
    if (error) {
      log.error('audit.insert_failed', error, { action: args.action });
      return false;
    }
    return true;
  } catch (err) {
    log.error('audit.insert_threw', err, { action: args.action });
    return false;
  }
}
