// Pure supplier-matching predicates extracted from rfq.ts so the
// matching rules can be unit-tested without a Supabase round-trip.
//
// The criteria mirror what the DB-level RFQ-match policy expresses:
//   - Supplier specializations must contain the requested service type
//   - If the RFQ has a city, the supplier's cities array must contain it
//     (or be empty, meaning "serves anywhere")
//
// Centralizing here keeps the trigger-based RLS, the email fanout, and
// any future search ranking using the same contract.

import type { Database } from '@/lib/supabase/types';

type ServiceType = Database['public']['Enums']['service_type'];

export interface MatchCandidate {
  id: string;
  owner_id: string;
  company_name: string;
  cities: string[];
  specializations: ServiceType[] | string[];
}

export interface MatchCriteria {
  serviceType: ServiceType | string;
  /** RFQ city. When null, supplier city is ignored. */
  city: string | null;
}

/**
 * True when a supplier specializes in the requested service type.
 * Pre-filtered at the DB level via .contains() but we replay it here so
 * the function is correct in isolation (e.g. when called with already-
 * fetched rows from a cache).
 */
export function specializesIn(
  supplier: Pick<MatchCandidate, 'specializations'>,
  serviceType: ServiceType | string
): boolean {
  if (!Array.isArray(supplier.specializations)) return false;
  return (supplier.specializations as string[]).includes(String(serviceType));
}

/**
 * True when the supplier's city list either includes the requested city or
 * is empty (which we interpret as "serves any city"). Returns true when
 * the requested city is null because city-less RFQs match every supplier.
 */
export function servesCity(
  supplier: Pick<MatchCandidate, 'cities'>,
  city: string | null
): boolean {
  if (!city) return true;
  if (!Array.isArray(supplier.cities)) return false;
  if (supplier.cities.length === 0) return true;
  return supplier.cities.includes(city);
}

/**
 * Returns the subset of `candidates` that match both criteria. Order is
 * preserved from input — callers can pre-rank by rating or proximity.
 */
export function filterMatchingSuppliers<T extends MatchCandidate>(
  candidates: ReadonlyArray<T>,
  criteria: MatchCriteria
): T[] {
  if (!Array.isArray(candidates)) return [];
  return candidates.filter(
    (s) =>
      specializesIn(s, criteria.serviceType) && servesCity(s, criteria.city)
  );
}
