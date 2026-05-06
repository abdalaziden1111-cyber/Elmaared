import { describe, it, expect } from 'vitest';
import { canTransition, getNextStatuses, isTerminalStatus } from '@/lib/utils/rfq-state-machine';

describe('canTransition', () => {
  it('client can publish draft', () => {
    expect(canTransition('draft', 'open', 'client')).toBe(true);
  });

  it('supplier cannot publish draft', () => {
    expect(canTransition('draft', 'open', 'supplier')).toBe(false);
  });

  it('client can award from negotiating', () => {
    expect(canTransition('negotiating', 'awarded', 'client')).toBe(true);
  });

  it('supplier can deliver from in_progress', () => {
    expect(canTransition('in_progress', 'delivered', 'supplier')).toBe(true);
  });

  it('admin can confirm escrow to in_progress', () => {
    expect(canTransition('in_escrow', 'in_progress', 'admin')).toBe(true);
  });

  it('client cannot skip from draft to awarded', () => {
    expect(canTransition('draft', 'awarded', 'client')).toBe(false);
  });

  it('nobody can transition from completed', () => {
    expect(canTransition('completed', 'open', 'admin')).toBe(false);
    expect(canTransition('completed', 'open', 'client')).toBe(false);
  });

  it('admin can resolve dispute to completed', () => {
    expect(canTransition('disputed', 'completed', 'admin')).toBe(true);
  });

  it('client cannot resolve dispute to completed', () => {
    expect(canTransition('disputed', 'completed', 'client')).toBe(false);
  });
});

describe('getNextStatuses', () => {
  it('returns correct options for open RFQ as client', () => {
    const next = getNextStatuses('open', 'client');
    expect(next).toContain('negotiating');
    expect(next).toContain('cancelled');
    expect(next).not.toContain('awarded');
  });

  it('returns empty for terminal status', () => {
    expect(getNextStatuses('completed', 'client')).toEqual([]);
    expect(getNextStatuses('cancelled', 'client')).toEqual([]);
  });
});

describe('isTerminalStatus', () => {
  it('completed is terminal', () => {
    expect(isTerminalStatus('completed')).toBe(true);
  });

  it('cancelled is terminal', () => {
    expect(isTerminalStatus('cancelled')).toBe(true);
  });

  it('in_progress is not terminal', () => {
    expect(isTerminalStatus('in_progress')).toBe(false);
  });
});
