// Type guards for narrowing untrusted input (URL params, FormData strings,
// JSON payloads) before passing it to typed helpers. Centralizing them here
// means the locale list and role list have one source of truth.
//
// Each guard is a `(x: unknown) => x is T` predicate so TypeScript narrows
// the variable inside the consuming `if` block.

import type { Database } from '@/lib/supabase/types';

const LOCALES = ['ar', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

const ROLES: ReadonlyArray<Database['public']['Enums']['user_role']> = [
  'admin',
  'client',
  'supplier',
];
type UserRole = Database['public']['Enums']['user_role'];

const SERVICE_TYPES: ReadonlyArray<Database['public']['Enums']['service_type']> = [
  'booth',
  'gifts',
  'event',
  'printing',
];
type ServiceType = Database['public']['Enums']['service_type'];

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

export function isServiceType(value: unknown): value is ServiceType {
  return typeof value === 'string' && (SERVICE_TYPES as readonly string[]).includes(value);
}

export function asLocale(value: unknown, fallback: Locale = 'ar'): Locale {
  return isLocale(value) ? value : fallback;
}

export function asUserRole(value: unknown): UserRole | null {
  return isUserRole(value) ? value : null;
}

export function asServiceType(value: unknown): ServiceType | null {
  return isServiceType(value) ? value : null;
}

/**
 * Verifies the value is a non-empty UUIDv4-shaped string. We don't depend on
 * a UUID library — the format check is enough to keep obvious junk
 * (URLs, SQL fragments, empty strings) from reaching DB queries.
 */
export function isUuid(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
