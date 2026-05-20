// Phase V2.1 — maybeFireMilestone idempotency.
// Uses a hand-rolled mock supabase client (no Supabase round-trip) so the
// test stays in the unit lane and runs without a live DB.

import { describe, it, expect, vi } from 'vitest';
import { maybeFireMilestone } from '@/lib/milestones/triggers';
import type { SupabaseClient } from '@supabase/supabase-js';

interface MockState {
  existingRow?: { id: string } | null;
  insertError?: { code?: string; message?: string } | null;
  insertCalls: number;
}

function makeMockClient(state: MockState): SupabaseClient {
  return {
    from(_table: string) {
      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        maybeSingle() {
          return Promise.resolve({ data: state.existingRow ?? null, error: null });
        },
        insert(_row: unknown) {
          state.insertCalls += 1;
          return Promise.resolve({ error: state.insertError ?? null });
        },
      };
    },
  } as unknown as SupabaseClient;
}

describe('maybeFireMilestone — idempotent insert', () => {
  it('fires when no row exists yet', async () => {
    const state: MockState = { existingRow: null, insertCalls: 0 };
    const client = makeMockClient(state);

    const result = await maybeFireMilestone('user-1', 'first_rfq', client);

    expect(result.fired).toBe(true);
    expect(state.insertCalls).toBe(1);
  });

  it('returns already_claimed when row exists (no insert)', async () => {
    const state: MockState = {
      existingRow: { id: 'milestone-1' },
      insertCalls: 0,
    };
    const client = makeMockClient(state);

    const result = await maybeFireMilestone(
      'user-1',
      'first_proposal_received',
      client
    );

    expect(result.fired).toBe(false);
    expect(result.reason).toBe('already_claimed');
    expect(state.insertCalls).toBe(0);
  });

  it('treats 23505 (unique violation) as already_claimed, not failure', async () => {
    // Race: pre-check missed the row but a concurrent insert raced ahead.
    const state: MockState = {
      existingRow: null,
      insertError: { code: '23505', message: 'duplicate key' },
      insertCalls: 0,
    };
    const client = makeMockClient(state);

    const result = await maybeFireMilestone(
      'user-1',
      'first_chat_opened',
      client
    );

    expect(result.fired).toBe(false);
    expect(result.reason).toBe('already_claimed');
  });

  it('returns insert_failed on non-23505 DB errors and logs', async () => {
    const state: MockState = {
      existingRow: null,
      insertError: { code: '42501', message: 'permission denied' },
      insertCalls: 0,
    };
    const client = makeMockClient(state);

    const result = await maybeFireMilestone(
      'user-1',
      'first_agreement_signed',
      client
    );

    expect(result.fired).toBe(false);
    expect(result.reason).toBe('insert_failed');
  });

  it('does not throw when the client itself rejects mid-flight', async () => {
    const bad: SupabaseClient = {
      from: () => {
        throw new Error('connection lost');
      },
    } as unknown as SupabaseClient;

    const result = await maybeFireMilestone('user-1', 'first_rfq', bad);

    expect(result.fired).toBe(false);
    expect(result.reason).toBe('insert_failed');
  });

  it('accepts every expanded MilestoneType value (TS surface check)', async () => {
    const state: MockState = { existingRow: null, insertCalls: 0 };
    const client = makeMockClient(state);

    const milestones = [
      'first_rfq',
      'first_proposal_received',
      'first_chat_opened',
      'first_agreement_signed',
      'first_escrow_funded',
      'first_project_completed',
      'first_deal',
      '100k_gmv',
      '500k_gmv',
      '1m_gmv',
      'yearly_anniversary',
    ] as const;

    for (const m of milestones) {
      state.existingRow = null;
      const result = await maybeFireMilestone('user-x', m, client);
      expect(result.fired).toBe(true);
    }
    expect(state.insertCalls).toBe(milestones.length);
  });
});

// Silence the structured logger during the negative-path test so it doesn't
// noise up the test output. The triggers module imports `log` directly so
// we spy on console (the default reporter) rather than the module.
vi.spyOn(console, 'error').mockImplementation(() => {});
