import { describe, it, expect } from 'vitest';
import {
  specializesIn,
  servesCity,
  filterMatchingSuppliers,
  type MatchCandidate,
} from '@/lib/matching/suppliers';

const supA: MatchCandidate = {
  id: 'a',
  owner_id: 'a',
  company_name: 'A',
  cities: ['Riyadh'],
  specializations: ['booth'],
};
const supB: MatchCandidate = {
  id: 'b',
  owner_id: 'b',
  company_name: 'B',
  cities: ['Jeddah'],
  specializations: ['gifts'],
};
const supC: MatchCandidate = {
  id: 'c',
  owner_id: 'c',
  company_name: 'C',
  cities: [], // serves anywhere
  specializations: ['booth', 'event'],
};
const supD: MatchCandidate = {
  id: 'd',
  owner_id: 'd',
  company_name: 'D',
  cities: ['Riyadh', 'Jeddah'],
  specializations: ['booth'],
};

describe('specializesIn', () => {
  it('true when supplier has the service in array', () => {
    expect(specializesIn(supA, 'booth')).toBe(true);
  });
  it('false when service not in array', () => {
    expect(specializesIn(supA, 'gifts')).toBe(false);
  });
  it('false for empty specializations', () => {
    expect(specializesIn({ specializations: [] }, 'booth')).toBe(false);
  });
  it('handles supplier with multiple specializations', () => {
    expect(specializesIn(supC, 'event')).toBe(true);
  });
  it('false when specializations is not an array', () => {
    // @ts-expect-error — runtime check
    expect(specializesIn({ specializations: null }, 'booth')).toBe(false);
  });
});

describe('servesCity', () => {
  it('true when supplier cities contain RFQ city', () => {
    expect(servesCity(supA, 'Riyadh')).toBe(true);
  });
  it('false when not in cities list', () => {
    expect(servesCity(supA, 'Jeddah')).toBe(false);
  });
  it('true when RFQ city is null (city-less RFQ)', () => {
    expect(servesCity(supA, null)).toBe(true);
  });
  it('true when supplier cities is empty (serves anywhere)', () => {
    expect(servesCity(supC, 'Tabuk')).toBe(true);
  });
  it('handles non-array cities (supplier data corruption)', () => {
    // @ts-expect-error — runtime check
    expect(servesCity({ cities: null }, 'Riyadh')).toBe(false);
  });
});

describe('filterMatchingSuppliers', () => {
  const all = [supA, supB, supC, supD];

  it('matches by service type', () => {
    const out = filterMatchingSuppliers(all, {
      serviceType: 'booth',
      city: null,
    });
    expect(out.map((s) => s.id).sort()).toEqual(['a', 'c', 'd']);
  });

  it('matches by service type + city', () => {
    const out = filterMatchingSuppliers(all, {
      serviceType: 'booth',
      city: 'Riyadh',
    });
    expect(out.map((s) => s.id).sort()).toEqual(['a', 'c', 'd']);
    // C is included because its cities array is empty (serves anywhere)
  });

  it('excludes wrong-city suppliers', () => {
    const out = filterMatchingSuppliers(all, {
      serviceType: 'booth',
      city: 'Tabuk',
    });
    // Only C (empty cities) matches in a city not in any specific list
    expect(out.map((s) => s.id)).toEqual(['c']);
  });

  it('excludes wrong-service suppliers regardless of city', () => {
    const out = filterMatchingSuppliers(all, {
      serviceType: 'gifts',
      city: 'Jeddah',
    });
    expect(out.map((s) => s.id)).toEqual(['b']);
  });

  it('preserves input order', () => {
    const out = filterMatchingSuppliers([supD, supA, supC], {
      serviceType: 'booth',
      city: null,
    });
    expect(out.map((s) => s.id)).toEqual(['d', 'a', 'c']);
  });

  it('returns empty for empty input', () => {
    expect(filterMatchingSuppliers([], { serviceType: 'booth', city: null })).toEqual([]);
  });

  it('returns empty for null/undefined candidates (defensive)', () => {
    // @ts-expect-error — runtime check
    expect(filterMatchingSuppliers(null, { serviceType: 'booth', city: null })).toEqual(
      []
    );
  });

  it('returns empty when no candidate matches the service', () => {
    const out = filterMatchingSuppliers(all, {
      serviceType: 'printing',
      city: null,
    });
    expect(out).toEqual([]);
  });
});
