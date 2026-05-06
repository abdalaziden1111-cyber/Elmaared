import { describe, it, expect } from 'vitest';
import {
  canTransition,
  getNextStatuses,
  isTerminalStatus,
} from '@/lib/utils/rfq-state-machine';

describe('canTransition — happy paths', () => {
  it('client can publish draft', () => {
    expect(canTransition('draft', 'open', 'client')).toBe(true);
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

  it('admin can resolve dispute to completed', () => {
    expect(canTransition('disputed', 'completed', 'admin')).toBe(true);
  });

  it('client can approve delivery to completed', () => {
    expect(canTransition('delivered', 'completed', 'client')).toBe(true);
  });
});

describe('canTransition — denials', () => {
  it('supplier cannot publish draft', () => {
    expect(canTransition('draft', 'open', 'supplier')).toBe(false);
  });

  it('client cannot skip from draft to awarded', () => {
    expect(canTransition('draft', 'awarded', 'client')).toBe(false);
  });

  it('admin cannot skip from draft to awarded', () => {
    expect(canTransition('draft', 'awarded', 'admin')).toBe(false);
  });

  it('client cannot resolve dispute to completed (admin only)', () => {
    expect(canTransition('disputed', 'completed', 'client')).toBe(false);
  });

  it('supplier cannot deliver from open', () => {
    expect(canTransition('open', 'delivered', 'supplier')).toBe(false);
  });
});

describe('canTransition — terminal states are sealed', () => {
  it('completed cannot transition anywhere for any role', () => {
    for (const to of ['open', 'in_progress', 'cancelled', 'disputed'] as const) {
      for (const role of ['admin', 'client', 'supplier'] as const) {
        expect(canTransition('completed', to, role)).toBe(false);
      }
    }
  });

  it('cancelled cannot transition anywhere for any role', () => {
    for (const to of ['open', 'draft', 'in_progress', 'completed'] as const) {
      for (const role of ['admin', 'client', 'supplier'] as const) {
        expect(canTransition('cancelled', to, role)).toBe(false);
      }
    }
  });
});

describe('canTransition — same-state guard', () => {
  it('rejects same-state transitions for every status', () => {
    const all = [
      'draft', 'open', 'negotiating', 'awarded', 'in_escrow',
      'in_progress', 'delivered', 'completed', 'disputed', 'cancelled',
    ] as const;
    for (const s of all) {
      expect(canTransition(s, s, 'admin')).toBe(false);
    }
  });
});

describe('canTransition — invalid inputs', () => {
  it('rejects unknown from-status', () => {
    // @ts-expect-error — testing runtime fallback
    expect(canTransition('imaginary_status', 'open', 'client')).toBe(false);
  });

  it('rejects unknown to-status', () => {
    // @ts-expect-error — testing runtime fallback
    expect(canTransition('draft', 'imaginary_status', 'client')).toBe(false);
  });

  it('rejects unknown role', () => {
    // @ts-expect-error — testing runtime fallback
    expect(canTransition('draft', 'open', 'visitor')).toBe(false);
  });

  it('rejects null status (defensive)', () => {
    // @ts-expect-error — testing runtime fallback
    expect(canTransition(null, 'open', 'client')).toBe(false);
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

  it('returns empty for unknown role', () => {
    // @ts-expect-error — runtime fallback
    expect(getNextStatuses('draft', 'visitor')).toEqual([]);
  });

  it('returns empty for unknown status', () => {
    // @ts-expect-error — runtime fallback
    expect(getNextStatuses('imaginary', 'client')).toEqual([]);
  });

  it('respects role on same status', () => {
    const adminNext = getNextStatuses('disputed', 'admin');
    const clientNext = getNextStatuses('disputed', 'client');
    expect(adminNext).toContain('completed');
    expect(clientNext).not.toContain('completed');
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

  it('every other workflow status is non-terminal', () => {
    const nonTerminal = [
      'draft', 'open', 'negotiating', 'awarded',
      'in_escrow', 'in_progress', 'delivered', 'disputed',
    ] as const;
    for (const s of nonTerminal) {
      expect(isTerminalStatus(s)).toBe(false);
    }
  });

  it('returns false for unknown status (forces caller to handle)', () => {
    // @ts-expect-error — runtime fallback
    expect(isTerminalStatus('imaginary')).toBe(false);
  });
});
