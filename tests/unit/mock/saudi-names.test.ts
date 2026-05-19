import { describe, it, expect } from 'vitest';
import {
  saudiNames,
  pickRandomName,
  namesByRegion,
} from '@/lib/mock/saudi-names';

describe('saudiNames library', () => {
  it('contains exactly 50 entries', () => {
    expect(saudiNames).toHaveLength(50);
  });

  it('has 10 names per region', () => {
    const counts = new Map<string, number>();
    for (const n of saudiNames) {
      counts.set(n.region, (counts.get(n.region) ?? 0) + 1);
    }
    expect(counts.get('najd')).toBe(10);
    expect(counts.get('hijaz')).toBe(10);
    expect(counts.get('eastern')).toBe(10);
    expect(counts.get('makkah_madinah')).toBe(10);
    expect(counts.get('asir_jazan')).toBe(10);
  });

  it('every entry has a Arabic name (matches the Arabic script range)', () => {
    for (const n of saudiNames) {
      expect(n.name).toMatch(/[؀-ۿ]/);
    }
  });

  it('has a mix of male and female names', () => {
    const males = saudiNames.filter((n) => n.gender === 'm').length;
    const females = saudiNames.filter((n) => n.gender === 'f').length;
    expect(males).toBeGreaterThan(15);
    expect(females).toBeGreaterThan(15);
    expect(males + females).toBe(50);
  });
});

describe('namesByRegion', () => {
  it('returns exactly the 10 names of a region', () => {
    expect(namesByRegion('najd')).toHaveLength(10);
    namesByRegion('najd').forEach((n) => expect(n.region).toBe('najd'));
  });
});

describe('pickRandomName', () => {
  it('returns the same name for the same seed (deterministic)', () => {
    const a = pickRandomName({ seed: 'rfq-001' });
    const b = pickRandomName({ seed: 'rfq-001' });
    expect(a.name).toBe(b.name);
  });

  it('returns different names for different seeds (probabilistic — sanity)', () => {
    const variants = new Set<string>();
    for (let i = 0; i < 20; i++) {
      variants.add(pickRandomName({ seed: `rfq-${i}` }).name);
    }
    // 20 distinct seeds → expect at least a few unique names
    expect(variants.size).toBeGreaterThan(3);
  });

  it('honors the region filter', () => {
    const out = pickRandomName({ seed: 'fixed', region: 'hijaz' });
    expect(out.region).toBe('hijaz');
  });

  it('honors the gender filter', () => {
    const out = pickRandomName({ seed: 'fixed', gender: 'f' });
    expect(out.gender).toBe('f');
  });

  it('combines region + gender filters', () => {
    const out = pickRandomName({ seed: 'fixed', region: 'najd', gender: 'm' });
    expect(out.region).toBe('najd');
    expect(out.gender).toBe('m');
  });

  it('returns the first name (never undefined) when filters match zero entries', () => {
    // No "g" gender exists — filter resolves to empty pool.
    const out = pickRandomName({
      seed: 'x',
      // @ts-expect-error — intentional empty-pool probe
      gender: 'g',
    });
    expect(out).toBe(saudiNames[0]);
  });
});
