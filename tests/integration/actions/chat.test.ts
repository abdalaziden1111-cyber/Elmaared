import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupabaseMock } from '@/tests/mocks/supabase-mock';

let supabaseMock = createSupabaseMock();
let adminMock = createSupabaseMock();

vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`__REDIRECT__:${url}`);
  },
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => Promise.resolve(supabaseMock.client),
}));
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => adminMock.client,
}));

beforeEach(() => {
  supabaseMock = createSupabaseMock();
  adminMock = createSupabaseMock();
  vi.resetModules();
});

describe('shortlistProposalAction', () => {
  it('rejects unauthenticated', async () => {
    const { shortlistProposalAction } = await import('@/app/actions/chat');
    const result = await shortlistProposalAction('prop-1');
    expect(result.ok).toBe(false);
  });

  it('rejects when proposal not found', async () => {
    supabaseMock.setUser({ id: 'usr-1' });
    const { shortlistProposalAction } = await import('@/app/actions/chat');
    const result = await shortlistProposalAction('prop-missing');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/لم نجد/);
  });

  it('rejects when caller does not own the RFQ', async () => {
    supabaseMock.setUser({ id: 'usr-attacker' });
    supabaseMock.setRows('proposals', [
      {
        id: 'prop-1',
        rfq_id: 'rfq-1',
        supplier_id: 'sup-1',
        status: 'submitted',
        rfq: { client_id: 'usr-owner' },
      },
    ]);
    const { shortlistProposalAction } = await import('@/app/actions/chat');
    const result = await shortlistProposalAction('prop-1');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/صلاحية/);
  });

  it('returns CHAT_CAP_REACHED with friendly message', async () => {
    supabaseMock.setUser({ id: 'usr-1' });
    supabaseMock.setRows('proposals', [
      {
        id: 'prop-1',
        rfq_id: 'rfq-1',
        supplier_id: 'sup-1',
        status: 'submitted',
        rfq: { client_id: 'usr-1' },
      },
    ]);
    adminMock.setError('chats', 'insert', {
      message: 'CHAT_CAP_REACHED',
    });
    const { shortlistProposalAction } = await import('@/app/actions/chat');
    const result = await shortlistProposalAction('prop-1');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/الأقصى من المحادثات/);
  });
});

describe('sendMessageAction', () => {
  it('rejects unauthenticated', async () => {
    const { sendMessageAction } = await import('@/app/actions/chat');
    const fd = new FormData();
    fd.set('chatId', 'chat-1');
    fd.set('content', 'hi');
    const result = await sendMessageAction(null, fd);
    expect(result.ok).toBe(false);
  });

  it('rejects empty message', async () => {
    supabaseMock.setUser({ id: 'usr-1' });
    const { sendMessageAction } = await import('@/app/actions/chat');
    const fd = new FormData();
    fd.set('chatId', 'chat-1');
    fd.set('content', '   ');
    const result = await sendMessageAction(null, fd);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/فارغة/);
  });

  it('rejects message over 4000 chars', async () => {
    supabaseMock.setUser({ id: 'usr-1' });
    const { sendMessageAction } = await import('@/app/actions/chat');
    const fd = new FormData();
    fd.set('chatId', 'chat-1');
    fd.set('content', 'x'.repeat(4001));
    const result = await sendMessageAction(null, fd);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/طويلة/);
  });

  it('rejects when profile lookup fails', async () => {
    supabaseMock.setUser({ id: 'usr-1' });
    // No profile row
    const { sendMessageAction } = await import('@/app/actions/chat');
    const fd = new FormData();
    fd.set('chatId', 'chat-1');
    fd.set('content', 'hi');
    const result = await sendMessageAction(null, fd);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/ملفك/);
  });
});

describe('raisePanicAction', () => {
  it('rejects too-short reason', async () => {
    const { raisePanicAction } = await import('@/app/actions/chat');
    const result = await raisePanicAction('chat-1', 'short');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/10 أحرف/);
  });

  it('rejects unauthenticated', async () => {
    const { raisePanicAction } = await import('@/app/actions/chat');
    const result = await raisePanicAction('chat-1', 'this is a serious issue');
    expect(result.ok).toBe(false);
  });
});
