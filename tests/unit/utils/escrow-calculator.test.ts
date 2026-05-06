import { describe, it, expect } from 'vitest';
import { calculateEscrow } from '@/lib/utils/escrow-calculator';

describe('calculateEscrow', () => {
  it('calculates correctly for 100,000 SAR contract', () => {
    const result = calculateEscrow(100000);

    expect(result.clientFee).toBe(2000);
    expect(result.supplierFee).toBe(3000);
    expect(result.platformRevenue).toBe(5000);
    expect(result.supplierNet).toBe(97000);
    expect(result.clientFeeVat).toBe(300);
    expect(result.supplierFeeVat).toBe(450);
    expect(result.totalVat).toBe(750);
    expect(result.totalAmount).toBe(102300);
    expect(result.initialDeposit).toBe(51150);
    expect(result.finalPayment).toBe(51150);
    expect(result.vatRateApplied).toBe(0.15);
  });

  it('calculates correctly for 50,000 SAR contract', () => {
    const result = calculateEscrow(50000);

    expect(result.clientFee).toBe(1000);
    expect(result.supplierFee).toBe(1500);
    expect(result.platformRevenue).toBe(2500);
    expect(result.supplierNet).toBe(48500);
  });

  it('handles small amounts', () => {
    const result = calculateEscrow(1000);

    expect(result.clientFee).toBe(20);
    expect(result.supplierFee).toBe(30);
    expect(result.platformRevenue).toBe(50);
    expect(result.supplierNet).toBe(970);
  });

  it('handles odd amounts without floating point errors', () => {
    const result = calculateEscrow(33333);

    expect(result.clientFee).toBe(666.66);
    expect(result.supplierFee).toBe(999.99);
    expect(result.supplierNet).toBe(32333.01);
  });

  it('initial + final = total', () => {
    const result = calculateEscrow(87500);
    expect(result.initialDeposit + result.finalPayment).toBe(result.totalAmount);
  });
});
