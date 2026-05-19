import { describe, it, expect, beforeEach, vi } from 'vitest';

// Phase Z2 Item 3 regression test.
//
// The bug the reorder fixes: shortlistProposalAction used to flip
//   proposals.status = 'shortlisted'
// BEFORE inserting into chats. When the chat insert blew up (cap reached
// or any other error) the proposal was stranded — visually shortlisted
// but with no chat.
//
// After the fix, the chat insert runs FIRST and the status flip only
// happens on success. These tests pin that contract by counting how
// many times `proposals.update({ status: 'shortlisted' })` is called
// down each failure branch.

const PROPOSAL_ID = 'p_test_1';
const RFQ_ID = 'rfq_test_1';
const SUPPLIER_ID = 's_test_1';
const CLIENT_ID = 'u_client';

const proposalRow = {
  id: PROPOSAL_ID,
  rfq_id: RFQ_ID,
  supplier_id: SUPPLIER_ID,
  status: 'submitted',
  rfq: { client_id: CLIENT_ID },
};

// Spies the tests assert against.
const proposalsUpdate = vi.fn();
const chatsInsertResult = { data: null as { id: string } | null, error: null as unknown };

function buildAdminClient() {
  // A minimal chainable mock — each `from('table')` returns a builder whose
  // `.select/.eq/.insert/.update/.single/.maybeSingle` calls all return `this`
  // until a terminal awaitable is hit. The terminal value depends on the table.
  const makeBuilder = (table: string) => {
    const builder: Record<string, unknown> = {};
    const chainable = ['select', 'eq', 'order', 'limit'];
    for (const m of chainable) builder[m] = vi.fn().mockReturnValue(builder);

    builder.single = vi.fn(async () => {
      if (table === 'proposals') return { data: proposalRow, error: null };
      if (table === 'chats') return chatsInsertResult;
      if (table === 'suppliers')
        return { data: { owner_id: 'u_supplier_owner' }, error: null };
      if (table === 'rfqs') return { data: { rfq_number: 'RFQ-0001' }, error: null };
      return { data: null, error: null };
    });

    builder.maybeSingle = vi.fn(async () => ({
      data: { preferred_language: 'ar' },
      error: null,
    }));

    builder.insert = vi.fn((_payload: unknown) => {
      if (table === 'chats') {
        // chats insert is followed by .select('id').single() — return self so
        // the chain continues; `.single()` already returns chatsInsertResult.
        return builder;
      }
      // messages / notifications inserts are fire-and-forget — return a
      // resolved promise.
      return Promise.resolve({ data: null, error: null });
    });

    builder.update = vi.fn((payload: Record<string, unknown>) => {
      if (table === 'proposals') {
        proposalsUpdate(payload);
      }
      // Returns a chainable that resolves when awaited.
      const thenable = {
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
          then: (resolve: (v: unknown) => void) =>
            resolve({ data: null, error: null }),
        }),
        then: (resolve: (v: unknown) => void) =>
          resolve({ data: null, error: null }),
      };
      return thenable;
    });

    return builder;
  };

  return {
    from: vi.fn((table: string) => makeBuilder(table)),
  };
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: { id: CLIENT_ID } },
        error: null,
      })),
    },
  })),
}));

const adminInstance = buildAdminClient();
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => adminInstance),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/notifications/build', () => ({
  buildNotification: vi.fn(() => ({
    title: 'tt',
    body: 'bb',
    link: '/',
  })),
}));

beforeEach(() => {
  proposalsUpdate.mockReset();
  chatsInsertResult.data = null;
  chatsInsertResult.error = null;
  // re-issue from() spy so per-test asserts on builder state stay clean
  adminInstance.from.mockClear();
});

describe('shortlistProposalAction — chat-then-status atomicity', () => {
  it('does NOT flip proposal status when chat insert raises CHAT_CAP_REACHED', async () => {
    chatsInsertResult.error = {
      message: 'CHAT_CAP_REACHED: Each RFQ allows up to 4 simultaneous chats.',
    };
    const { shortlistProposalAction } = await import('@/app/actions/chat');
    const result = await shortlistProposalAction(PROPOSAL_ID);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      // The cap error string uses the configured Arabic message; we just
      // confirm it's the cap-specific message (not the generic fallback).
      expect(result.error).toContain('(4)');
    }
    // The critical invariant: the proposal status flip never ran.
    expect(proposalsUpdate).not.toHaveBeenCalled();
  });

  it('does NOT flip proposal status when chat insert raises a generic error', async () => {
    chatsInsertResult.error = { message: 'some random DB error' };
    const { shortlistProposalAction } = await import('@/app/actions/chat');
    const result = await shortlistProposalAction(PROPOSAL_ID);

    expect(result.ok).toBe(false);
    expect(proposalsUpdate).not.toHaveBeenCalled();
  });

  it('flips proposal status exactly once after a successful chat insert', async () => {
    chatsInsertResult.data = { id: 'chat_new_1' };
    const { shortlistProposalAction } = await import('@/app/actions/chat');
    const result = await shortlistProposalAction(PROPOSAL_ID);

    expect(result.ok).toBe(true);
    if (result.ok && result.data) {
      expect(result.data.chatId).toBe('chat_new_1');
    }
    expect(proposalsUpdate).toHaveBeenCalledTimes(1);
    expect(proposalsUpdate).toHaveBeenCalledWith({ status: 'shortlisted' });
  });
});
