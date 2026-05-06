import { describe, it, expect } from 'vitest';
import {
  calculateEscrow,
  safeCalculateEscrow,
  EscrowInputError,
} from '@/lib/utils/escrow-calculator';

describe('calculateEscrow — happy paths', () => {
  it('calculates correctly for 100,000 SAR contract', () => {
    const r = calculateEscrow(100000);
    expect(r.clientFee).toBe(2000);
    expect(r.supplierFee).toBe(3000);
    expect(r.platformRevenue).toBe(5000);
    expect(r.supplierNet).toBe(97000);
    expect(r.clientFeeVat).toBe(300);
    expect(r.supplierFeeVat).toBe(450);
    expect(r.totalVat).toBe(750);
    expect(r.totalAmount).toBe(102300);
    expect(r.initialDeposit).toBe(51150);
    expect(r.finalPayment).toBe(51150);
    expect(r.vatRateApplied).toBe(0.15);
  });

  it('calculates correctly for 50,000 SAR contract', () => {
    const r = calculateEscrow(50000);
    expect(r.clientFee).toBe(1000);
    expect(r.supplierFee).toBe(1500);
    expect(r.platformRevenue).toBe(2500);
    expect(r.supplierNet).toBe(48500);
  });

  it('handles small amounts (1,000 SAR)', () => {
    const r = calculateEscrow(1000);
    expect(r.clientFee).toBe(20);
    expect(r.supplierFee).toBe(30);
    expect(r.platformRevenue).toBe(50);
    expect(r.supplierNet).toBe(970);
  });

  it('handles odd amounts without floating point errors', () => {
    const r = calculateEscrow(33333);
    expect(r.clientFee).toBe(666.66);
    expect(r.supplierFee).toBe(999.99);
    expect(r.supplierNet).toBe(32333.01);
  });

  it('initial + final = total for arbitrary amount', () => {
    const r = calculateEscrow(87500);
    expect(r.initialDeposit + r.finalPayment).toBe(r.totalAmount);
  });

  it('handles minimum non-zero amount (1 SAR)', () => {
    const r = calculateEscrow(1);
    expect(r.clientFee).toBe(0.02);
    expect(r.supplierFee).toBe(0.03);
    expect(r.supplierNet).toBe(0.97);
    expect(r.initialDeposit + r.finalPayment).toBe(r.totalAmount);
  });

  it('handles fractional amounts (e.g. 1234.56 SAR)', () => {
    const r = calculateEscrow(1234.56);
    expect(r.clientFee).toBe(24.69);
    expect(r.supplierFee).toBe(37.04);
    expect(r.totalAmount).toBeGreaterThan(1234.56);
  });

  it('handles zero — returns all-zero breakdown', () => {
    const r = calculateEscrow(0);
    expect(r.clientFee).toBe(0);
    expect(r.supplierFee).toBe(0);
    expect(r.platformRevenue).toBe(0);
    expect(r.supplierNet).toBe(0);
    expect(r.totalAmount).toBe(0);
    expect(r.initialDeposit).toBe(0);
    expect(r.finalPayment).toBe(0);
  });

  it('handles a 10M contract without precision loss', () => {
    const r = calculateEscrow(10_000_000);
    expect(r.clientFee).toBe(200000);
    expect(r.supplierFee).toBe(300000);
    expect(r.supplierNet).toBe(9_700_000);
    expect(r.initialDeposit + r.finalPayment).toBe(r.totalAmount);
  });

  it("doesn't break on numbers with classic float pitfalls (0.1 + 0.2)", () => {
    const r = calculateEscrow(0.1 + 0.2); // 0.30000000000000004 in JS
    // Rounded to 2 decimals — no garbage tail
    expect(r.clientFee.toString()).not.toMatch(/0{5}/);
  });
});

describe('calculateEscrow — invalid inputs', () => {
  it('throws on NaN', () => {
    expect(() => calculateEscrow(NaN)).toThrow(EscrowInputError);
    try {
      calculateEscrow(NaN);
    } catch (e) {
      expect((e as EscrowInputError).cause).toBe('nan');
    }
  });

  it('throws on Infinity', () => {
    expect(() => calculateEscrow(Infinity)).toThrow(EscrowInputError);
    try {
      calculateEscrow(Infinity);
    } catch (e) {
      expect((e as EscrowInputError).cause).toBe('infinite');
    }
  });

  it('throws on -Infinity', () => {
    expect(() => calculateEscrow(-Infinity)).toThrow(EscrowInputError);
  });

  it('throws on negative amount', () => {
    expect(() => calculateEscrow(-1)).toThrow(EscrowInputError);
    try {
      calculateEscrow(-100);
    } catch (e) {
      expect((e as EscrowInputError).cause).toBe('negative');
    }
  });

  it('throws on absurdly large amount (above MAX_CONTRACT_PRICE)', () => {
    expect(() => calculateEscrow(2_000_000_000)).toThrow(EscrowInputError);
    try {
      calculateEscrow(2_000_000_000);
    } catch (e) {
      expect((e as EscrowInputError).cause).toBe('too_large');
    }
  });
});

describe('safeCalculateEscrow', () => {
  it('returns null for null input', () => {
    expect(safeCalculateEscrow(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(safeCalculateEscrow(undefined)).toBeNull();
  });

  it('returns null for NaN', () => {
    expect(safeCalculateEscrow(NaN)).toBeNull();
  });

  it('returns null for negative', () => {
    expect(safeCalculateEscrow(-100)).toBeNull();
  });

  it('returns null for too-large', () => {
    expect(safeCalculateEscrow(2_000_000_000)).toBeNull();
  });

  it('returns a calculation for valid input', () => {
    const r = safeCalculateEscrow(50000);
    expect(r).not.toBeNull();
    expect(r?.clientFee).toBe(1000);
  });

  it('returns calculation for zero', () => {
    const r = safeCalculateEscrow(0);
    expect(r).not.toBeNull();
    expect(r?.totalAmount).toBe(0);
  });
});
