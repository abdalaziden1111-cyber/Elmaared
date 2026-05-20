// Phase V1.3 — AI Lead Scoring: deterministic scoring + categorization.

import { describe, it, expect } from 'vitest';
import {
  scoreLeadDeterministic,
  categorize,
} from '@/lib/ai/score-lead';
import type { LeadSignals } from '@/lib/ai/lead-signals';

function baseSignals(overrides: Partial<LeadSignals> = {}): LeadSignals {
  return {
    role: 'client',
    daysSinceSignup: 1,
    daysSinceLastRfq: null,
    daysSinceLastProposal: null,
    rfqCount: 0,
    rfqsLast30Days: 0,
    proposalsSubmitted: 0,
    proposalsShortlisted: 0,
    proposalsAccepted: 0,
    agreementsSigned: 0,
    escrowsFunded: 0,
    projectsCompleted: 0,
    totalGmvSar: 0,
    daysSinceLastActivity: null,
    ...overrides,
  };
}

describe('categorize', () => {
  it('hot ≥ 70', () => {
    expect(categorize(70)).toBe('hot');
    expect(categorize(85)).toBe('hot');
    expect(categorize(100)).toBe('hot');
  });
  it('warm 40-69', () => {
    expect(categorize(40)).toBe('warm');
    expect(categorize(50)).toBe('warm');
    expect(categorize(69)).toBe('warm');
  });
  it('cold < 40', () => {
    expect(categorize(0)).toBe('cold');
    expect(categorize(39)).toBe('cold');
  });
});

describe('scoreLeadDeterministic — boundary cases', () => {
  it('admin role always returns 0', () => {
    const score = scoreLeadDeterministic(baseSignals({ role: 'admin' }));
    expect(score).toBe(0);
  });

  it('fresh signup with no activity is cold (< 40)', () => {
    const score = scoreLeadDeterministic(baseSignals());
    expect(categorize(score)).toBe('cold');
  });

  it('client with 5 RFQs + 1 escrow funded + recent activity is warm', () => {
    const score = scoreLeadDeterministic(
      baseSignals({
        rfqCount: 5,
        escrowsFunded: 1,
        agreementsSigned: 1,
        proposalsShortlisted: 1,
        daysSinceLastActivity: 5,
        daysSinceLastRfq: 5,
      })
    );
    expect(categorize(score)).toBe('warm');
    expect(score).toBeGreaterThanOrEqual(40);
    expect(score).toBeLessThan(70);
  });

  it('client with 1 completed project + recent activity is hot', () => {
    const score = scoreLeadDeterministic(
      baseSignals({
        rfqCount: 2,
        agreementsSigned: 1,
        escrowsFunded: 1,
        projectsCompleted: 1,
        proposalsAccepted: 1,
        totalGmvSar: 75_000,
        daysSinceLastActivity: 3,
        daysSinceLastRfq: 3,
      })
    );
    expect(score).toBeGreaterThanOrEqual(70);
    expect(categorize(score)).toBe('hot');
  });

  it('supplier with 30 proposals + projects is hot', () => {
    const score = scoreLeadDeterministic(
      baseSignals({
        role: 'supplier',
        rfqCount: 0,
        proposalsSubmitted: 30,
        proposalsShortlisted: 5,
        proposalsAccepted: 3,
        agreementsSigned: 3,
        projectsCompleted: 3,
        totalGmvSar: 350_000,
        daysSinceLastActivity: 2,
        daysSinceLastProposal: 2,
      })
    );
    expect(categorize(score)).toBe('hot');
  });

  it('dormant client (60+ days signup, zero activity) gets penalty applied', () => {
    const cold = scoreLeadDeterministic(
      baseSignals({
        daysSinceSignup: 90,
        rfqCount: 0,
        proposalsSubmitted: 0,
        daysSinceLastActivity: null,
      })
    );
    expect(cold).toBe(0); // penalty caps at 0
  });

  it('recent activity (< 7 days) gives 20 bonus points', () => {
    const recent = scoreLeadDeterministic(
      baseSignals({ daysSinceLastActivity: 3, rfqCount: 1 })
    );
    const old = scoreLeadDeterministic(
      baseSignals({ daysSinceLastActivity: 100, rfqCount: 1 })
    );
    expect(recent - old).toBeGreaterThanOrEqual(20);
  });

  it('GMV ≥ 500k accumulates all 4 GMV tiers (40 pts)', () => {
    const withBigGmv = scoreLeadDeterministic(
      baseSignals({
        totalGmvSar: 600_000,
        projectsCompleted: 0, // isolate GMV contribution
      })
    );
    const noGmv = scoreLeadDeterministic(baseSignals({ totalGmvSar: 0 }));
    expect(withBigGmv - noGmv).toBe(40);
  });

  it('GMV scales: 50k = 20 pts, 200k = 30 pts, 500k = 40 pts', () => {
    const at50k = scoreLeadDeterministic(baseSignals({ totalGmvSar: 50_000 }));
    const at200k = scoreLeadDeterministic(baseSignals({ totalGmvSar: 200_000 }));
    const at500k = scoreLeadDeterministic(baseSignals({ totalGmvSar: 500_000 }));
    expect(at50k).toBe(20);
    expect(at200k).toBe(30);
    expect(at500k).toBe(40);
  });

  it('score is clamped to 0-100', () => {
    // Max-out every category
    const max = scoreLeadDeterministic(
      baseSignals({
        totalGmvSar: 10_000_000,
        projectsCompleted: 50,
        escrowsFunded: 50,
        agreementsSigned: 50,
        proposalsAccepted: 50,
        rfqCount: 100,
        proposalsSubmitted: 100,
        daysSinceLastActivity: 1,
      })
    );
    expect(max).toBeLessThanOrEqual(100);
    expect(max).toBeGreaterThanOrEqual(0);
  });

  it('client with 0 RFQs after 60 days but recent login still loses 10 pts via dormancy penalty', () => {
    // Even with recency bonus, dormancy penalty applies separately
    const withPenalty = scoreLeadDeterministic(
      baseSignals({
        daysSinceSignup: 100,
        rfqCount: 0,
        proposalsSubmitted: 0,
        daysSinceLastActivity: 5, // recent visit
      })
    );
    const withoutPenalty = scoreLeadDeterministic(
      baseSignals({
        daysSinceSignup: 10, // newer signup, no penalty
        rfqCount: 0,
        proposalsSubmitted: 0,
        daysSinceLastActivity: 5,
      })
    );
    expect(withPenalty).toBeLessThan(withoutPenalty);
  });
});
