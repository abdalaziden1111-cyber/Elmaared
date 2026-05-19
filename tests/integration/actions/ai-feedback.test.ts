import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupabaseMock } from '@/tests/mocks/supabase-mock';

// Mirrors the integration-test pattern from chat.test.ts.

let supabaseMock = createSupabaseMock();
let adminMock = createSupabaseMock();

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

describe('submitAiFeedbackAction', () => {
  it('rejects unauthenticated callers', async () => {
    const { submitAiFeedbackAction } = await import('@/app/actions/ai-feedback');
    const result = await submitAiFeedbackAction({
      proposalId: '00000000-0000-4000-8000-000000000001',
      reason: 'price_too_high',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/تسجيل الدخول/);
  });

  it('rejects an invalid reason value', async () => {
    supabaseMock.setUser({ id: 'usr-1' });
    const { submitAiFeedbackAction } = await import('@/app/actions/ai-feedback');
    const result = await submitAiFeedbackAction({
      proposalId: 'not-a-uuid',
      // @ts-expect-error — intentionally invalid for negative test
      reason: 'BOGUS',
    });
    expect(result.ok).toBe(false);
  });

  it('rejects a caller who does not own the RFQ', async () => {
    supabaseMock.setUser({ id: 'usr-attacker' });
    adminMock.setRows('proposals', [
      {
        id: '00000000-0000-4000-8000-000000000001',
        rfq: { client_id: 'usr-owner' },
      },
    ]);
    const { submitAiFeedbackAction } = await import('@/app/actions/ai-feedback');
    const result = await submitAiFeedbackAction({
      proposalId: '00000000-0000-4000-8000-000000000001',
      reason: 'price_too_high',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/صلاحية/);
  });

  it('upserts when the caller owns the RFQ', async () => {
    supabaseMock.setUser({ id: 'usr-owner' });
    adminMock.setRows('proposals', [
      {
        id: '00000000-0000-4000-8000-000000000001',
        rfq: { client_id: 'usr-owner' },
      },
    ]);
    const { submitAiFeedbackAction } = await import('@/app/actions/ai-feedback');
    const result = await submitAiFeedbackAction({
      proposalId: '00000000-0000-4000-8000-000000000001',
      reason: 'illogical',
      comment: 'AI rated low-quality offer high',
    });
    expect(result.ok).toBe(true);
  });

  it('returns a friendly error when proposal is missing', async () => {
    supabaseMock.setUser({ id: 'usr-1' });
    const { submitAiFeedbackAction } = await import('@/app/actions/ai-feedback');
    const result = await submitAiFeedbackAction({
      proposalId: '00000000-0000-4000-8000-000000000999',
      reason: 'price_too_low',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/لم نجد/);
  });
});
