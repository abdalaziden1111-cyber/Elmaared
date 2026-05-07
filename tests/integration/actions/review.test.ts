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
vi.mock('next/server', () => ({
  after: (fn: () => Promise<void> | void) => Promise.resolve().then(() => fn()),
}));
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

function validForm(): FormData {
  const fd = new FormData();
  fd.set('rfqId', 'rfq-1');
  fd.set('ratingOverall', '5');
  fd.set('comment', 'ممتاز');
  return fd;
}

describe('submitReviewAction — auth gate', () => {
  it('rejects unauthenticated', async () => {
    const { submitReviewAction } = await import('@/app/actions/review');
    const result = await submitReviewAction(null, validForm());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/تسجيل الدخول/);
  });
});

describe('submitReviewAction — ownership', () => {
  it('rejects when caller is not the RFQ client', async () => {
    supabaseMock.setUser({ id: 'usr-attacker' });
    adminMock.setRows('rfqs', [
      {
        id: 'rfq-1',
        client_id: 'usr-owner',
        status: 'completed',
        winning_proposal_id: 'prop-1',
      },
    ]);
    const { submitReviewAction } = await import('@/app/actions/review');
    const result = await submitReviewAction(null, validForm());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/صلاحية/);
  });

  it('rejects when project not completed', async () => {
    supabaseMock.setUser({ id: 'usr-1' });
    adminMock.setRows('rfqs', [
      {
        id: 'rfq-1',
        client_id: 'usr-1',
        status: 'in_progress',
        winning_proposal_id: 'prop-1',
      },
    ]);
    const { submitReviewAction } = await import('@/app/actions/review');
    const result = await submitReviewAction(null, validForm());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/اكتمال المشروع/);
  });
});

describe('submitReviewAction — validation', () => {
  it('rejects rating outside 1-5', async () => {
    supabaseMock.setUser({ id: 'usr-1' });
    const { submitReviewAction } = await import('@/app/actions/review');
    const fd = validForm();
    fd.set('ratingOverall', '7');
    const result = await submitReviewAction(null, fd);
    expect(result.ok).toBe(false);
  });

  it('rejects missing ratingOverall', async () => {
    supabaseMock.setUser({ id: 'usr-1' });
    const { submitReviewAction } = await import('@/app/actions/review');
    const fd = new FormData();
    fd.set('rfqId', 'rfq-1');
    const result = await submitReviewAction(null, fd);
    expect(result.ok).toBe(false);
  });
});

describe('submitReviewAction — DB error mapping', () => {
  it('maps duplicate review via mapPostgresError', async () => {
    supabaseMock.setUser({ id: 'usr-1' });
    adminMock.setRows('rfqs', [
      {
        id: 'rfq-1',
        client_id: 'usr-1',
        status: 'completed',
        winning_proposal_id: 'prop-1',
      },
    ]);
    adminMock.setRows('proposals', [{ id: 'prop-1', supplier_id: 'sup-1' }]);
    adminMock.setError('reviews', 'insert', {
      code: '23505',
      message: 'duplicate key value violates unique constraint "reviews_rfq_id_key"',
    });
    const { submitReviewAction } = await import('@/app/actions/review');
    const result = await submitReviewAction(null, validForm());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/قيّمت/);
  });
});

describe('openDisputeAction', () => {
  it('rejects unauthenticated', async () => {
    const { openDisputeAction } = await import('@/app/actions/review');
    const fd = new FormData();
    fd.set('rfqId', 'rfq-1');
    fd.set('category', 'quality');
    fd.set('description', 'a'.repeat(50));
    const result = await openDisputeAction(null, fd);
    expect(result.ok).toBe(false);
  });

  it('rejects missing category', async () => {
    supabaseMock.setUser({ id: 'usr-1' });
    supabaseMock.setRows('profiles', [{ id: 'usr-1', role: 'client' }]);
    const { openDisputeAction } = await import('@/app/actions/review');
    const fd = new FormData();
    fd.set('rfqId', 'rfq-1');
    fd.set('description', 'a'.repeat(50));
    const result = await openDisputeAction(null, fd);
    expect(result.ok).toBe(false);
  });

  it('rejects too-short description', async () => {
    supabaseMock.setUser({ id: 'usr-1' });
    supabaseMock.setRows('profiles', [{ id: 'usr-1', role: 'client' }]);
    const { openDisputeAction } = await import('@/app/actions/review');
    const fd = new FormData();
    fd.set('rfqId', 'rfq-1');
    fd.set('category', 'quality');
    fd.set('description', 'short');
    const result = await openDisputeAction(null, fd);
    expect(result.ok).toBe(false);
  });
});
