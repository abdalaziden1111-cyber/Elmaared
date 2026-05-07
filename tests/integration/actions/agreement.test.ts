/**
 * Integration tests for app/actions/agreement.ts.
 * Covers awardWinnerAction ownership + side-effects, submitUnderstandingAction
 * dispatch by role, signAgreementAction dual-signature flow.
 */
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
vi.mock('@/lib/ai/analyze-agreement', () => ({
  analyzeAgreement: vi.fn().mockResolvedValue(undefined),
}));

beforeEach(() => {
  supabaseMock = createSupabaseMock();
  adminMock = createSupabaseMock();
  vi.resetModules();
});

describe('awardWinnerAction', () => {
  it('rejects unauthenticated', async () => {
    const { awardWinnerAction } = await import('@/app/actions/agreement');
    const result = await awardWinnerAction('prop-1');
    expect(result.ok).toBe(false);
  });

  it('rejects non-owner of the RFQ', async () => {
    supabaseMock.setUser({ id: 'usr-attacker' });
    adminMock.setRows('proposals', [
      {
        id: 'prop-1',
        rfq_id: 'rfq-1',
        supplier_id: 'sup-1',
        total_price: 50000,
        description: null,
        scope_of_work: null,
      },
    ]);
    adminMock.setRows('rfqs', [
      { id: 'rfq-1', client_id: 'usr-owner', status: 'negotiating' },
    ]);
    const { awardWinnerAction } = await import('@/app/actions/agreement');
    const result = await awardWinnerAction('prop-1');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/صلاحية/);
  });

  it('archives losing chats and updates RFQ to awarded', async () => {
    supabaseMock.setUser({ id: 'usr-1' });
    adminMock.setRows('proposals', [
      {
        id: 'prop-1',
        rfq_id: 'rfq-1',
        supplier_id: 'sup-winner',
        total_price: 50000,
        description: 'desc',
        scope_of_work: 'scope',
      },
    ]);
    adminMock.setRows('rfqs', [
      { id: 'rfq-1', client_id: 'usr-1', status: 'negotiating' },
    ]);

    const { awardWinnerAction } = await import('@/app/actions/agreement');
    const result = await awardWinnerAction('prop-1');
    expect(result.ok).toBe(true);

    // Updates: proposal accepted, others rejected, RFQ awarded, chats archived
    const proposalUpdates = adminMock.getUpdates('proposals');
    expect(proposalUpdates.length).toBeGreaterThanOrEqual(2); // winner + losers

    const rfqUpdates = adminMock.getUpdates('rfqs');
    expect(rfqUpdates.length).toBe(1);
    expect(rfqUpdates[0].values).toMatchObject({
      status: 'awarded',
      winning_proposal_id: 'prop-1',
    });

    const chatUpdates = adminMock.getUpdates('chats');
    expect(chatUpdates.length).toBe(1);
    expect(chatUpdates[0].values).toMatchObject({ is_archived: true });

    // Audit log written
    const audits = adminMock.getInserts('audit_logs');
    expect(audits.length).toBe(1);
    expect(audits[0]).toMatchObject({ action: 'rfq_awarded' });
  });

  it('returns mapped error if agreement insert fails', async () => {
    supabaseMock.setUser({ id: 'usr-1' });
    adminMock.setRows('proposals', [
      {
        id: 'prop-1',
        rfq_id: 'rfq-1',
        supplier_id: 'sup-1',
        total_price: 50000,
        description: null,
        scope_of_work: null,
      },
    ]);
    adminMock.setRows('rfqs', [
      { id: 'rfq-1', client_id: 'usr-1', status: 'negotiating' },
    ]);
    adminMock.setError('agreements', 'insert', {
      code: '23503',
      message: 'fk constraint',
    });

    const { awardWinnerAction } = await import('@/app/actions/agreement');
    const result = await awardWinnerAction('prop-1');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/المرتبط/);
  });
});

describe('submitUnderstandingAction — validation', () => {
  it('rejects too-short understanding (< 100 chars)', async () => {
    const { submitUnderstandingAction } = await import(
      '@/app/actions/agreement'
    );
    const fd = new FormData();
    fd.set('agreementId', 'ag-1');
    fd.set('understanding', 'too short');
    const result = await submitUnderstandingAction(null, fd);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/100 حرف/);
  });

  it('rejects unauthenticated', async () => {
    const { submitUnderstandingAction } = await import(
      '@/app/actions/agreement'
    );
    const fd = new FormData();
    fd.set('agreementId', 'ag-1');
    fd.set('understanding', 'a'.repeat(150));
    const result = await submitUnderstandingAction(null, fd);
    expect(result.ok).toBe(false);
  });

  it('rejects when agreement not found', async () => {
    supabaseMock.setUser({ id: 'usr-1' });
    supabaseMock.setRows('profiles', [{ id: 'usr-1', role: 'client' }]);
    const { submitUnderstandingAction } = await import(
      '@/app/actions/agreement'
    );
    const fd = new FormData();
    fd.set('agreementId', 'ag-missing');
    fd.set('understanding', 'a'.repeat(150));
    const result = await submitUnderstandingAction(null, fd);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/لم نجد/);
  });

  it('rejects when caller is neither client nor supplier of the agreement', async () => {
    supabaseMock.setUser({ id: 'usr-attacker' });
    supabaseMock.setRows('profiles', [{ id: 'usr-attacker', role: 'client' }]);
    adminMock.setRows('agreements', [
      {
        id: 'ag-1',
        client_id: 'usr-real-client',
        supplier_id: 'sup-1',
        client_understanding: '',
        supplier_understanding: '',
        rfq_id: 'rfq-1',
        proposal_id: 'prop-1',
      },
    ]);
    const { submitUnderstandingAction } = await import(
      '@/app/actions/agreement'
    );
    const fd = new FormData();
    fd.set('agreementId', 'ag-1');
    fd.set('understanding', 'a'.repeat(150));
    const result = await submitUnderstandingAction(null, fd);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/صلاحية/);
  });
});

describe('signAgreementAction', () => {
  it('rejects unauthenticated', async () => {
    const { signAgreementAction } = await import('@/app/actions/agreement');
    const result = await signAgreementAction('ag-1');
    expect(result.ok).toBe(false);
  });

  it('rejects when agreement not found', async () => {
    supabaseMock.setUser({ id: 'usr-1' });
    supabaseMock.setRows('profiles', [{ id: 'usr-1', role: 'client' }]);
    const { signAgreementAction } = await import('@/app/actions/agreement');
    const result = await signAgreementAction('ag-missing');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/لم نجد/);
  });

  it('rejects non-party (attacker)', async () => {
    supabaseMock.setUser({ id: 'usr-attacker' });
    supabaseMock.setRows('profiles', [{ id: 'usr-attacker', role: 'client' }]);
    adminMock.setRows('agreements', [
      {
        id: 'ag-1',
        rfq_id: 'rfq-1',
        client_id: 'usr-real',
        supplier_id: 'sup-1',
        client_approved_at: null,
        supplier_approved_at: null,
      },
    ]);
    const { signAgreementAction } = await import('@/app/actions/agreement');
    const result = await signAgreementAction('ag-1');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/صلاحية/);
  });

  it('client sign records client_approved_at', async () => {
    supabaseMock.setUser({ id: 'usr-1' });
    supabaseMock.setRows('profiles', [{ id: 'usr-1', role: 'client' }]);
    adminMock.setRows('agreements', [
      {
        id: 'ag-1',
        rfq_id: 'rfq-1',
        client_id: 'usr-1',
        supplier_id: 'sup-1',
        client_approved_at: null,
        supplier_approved_at: null,
      },
    ]);
    const { signAgreementAction } = await import('@/app/actions/agreement');
    const result = await signAgreementAction('ag-1');
    expect(result.ok).toBe(true);

    const updates = adminMock.getUpdates('agreements');
    const signUpdate = updates.find(
      (u) => 'client_approved_at' in u.values
    );
    expect(signUpdate).toBeDefined();
    expect((signUpdate?.values as { client_approved_at?: string }).client_approved_at).toBeDefined();
  });
});
