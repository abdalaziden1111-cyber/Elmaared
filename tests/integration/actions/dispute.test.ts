/**
 * Integration tests for adminResolveDisputeAction (and the audit side-effect
 * on openDisputeAction).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupabaseMock } from '@/tests/mocks/supabase-mock';

let supabaseMock = createSupabaseMock();
let adminMock = createSupabaseMock();
const requireRoleMock = vi.fn();

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
vi.mock('@/lib/auth/require-role', () => ({
  requireRole: (...args: unknown[]) => requireRoleMock(...args),
}));

beforeEach(() => {
  supabaseMock = createSupabaseMock();
  adminMock = createSupabaseMock();
  requireRoleMock.mockReset();
  vi.resetModules();
});

describe('adminResolveDisputeAction — input validation', () => {
  beforeEach(() => {
    requireRoleMock.mockResolvedValue({ user: { id: 'admin-1' }, role: 'admin' });
  });

  it('rejects empty disputeId', async () => {
    const { adminResolveDisputeAction } = await import('@/app/actions/review');
    const result = await adminResolveDisputeAction({
      disputeId: '',
      resolution: 'a'.repeat(50),
      inFavorOf: 'client',
      resumeRfqStatus: 'in_progress',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/النزاع/);
  });

  it('rejects too-short resolution (< 20 chars)', async () => {
    const { adminResolveDisputeAction } = await import('@/app/actions/review');
    const result = await adminResolveDisputeAction({
      disputeId: 'd-1',
      resolution: 'short',
      inFavorOf: 'client',
      resumeRfqStatus: 'in_progress',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/20 حرف/);
  });

  it('rejects negative refundDecision', async () => {
    const { adminResolveDisputeAction } = await import('@/app/actions/review');
    const result = await adminResolveDisputeAction({
      disputeId: 'd-1',
      resolution: 'a'.repeat(50),
      inFavorOf: 'client',
      refundDecision: -100,
      resumeRfqStatus: 'in_progress',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/الاسترداد/);
  });

  it('rejects NaN refundDecision', async () => {
    const { adminResolveDisputeAction } = await import('@/app/actions/review');
    const result = await adminResolveDisputeAction({
      disputeId: 'd-1',
      resolution: 'a'.repeat(50),
      inFavorOf: 'client',
      refundDecision: NaN,
      resumeRfqStatus: 'in_progress',
    });
    expect(result.ok).toBe(false);
  });
});

describe('adminResolveDisputeAction — dispute lifecycle', () => {
  beforeEach(() => {
    requireRoleMock.mockResolvedValue({ user: { id: 'admin-1' }, role: 'admin' });
  });

  it('rejects when dispute not found', async () => {
    const { adminResolveDisputeAction } = await import('@/app/actions/review');
    const result = await adminResolveDisputeAction({
      disputeId: 'd-missing',
      resolution: 'a'.repeat(50),
      inFavorOf: 'client',
      resumeRfqStatus: 'in_progress',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/لم نجد/);
  });

  it('rejects when dispute already resolved', async () => {
    adminMock.setRows('disputes', [
      { id: 'd-1', rfq_id: 'rfq-1', status: 'resolved' },
    ]);
    const { adminResolveDisputeAction } = await import('@/app/actions/review');
    const result = await adminResolveDisputeAction({
      disputeId: 'd-1',
      resolution: 'a'.repeat(50),
      inFavorOf: 'client',
      resumeRfqStatus: 'in_progress',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/إغلاقه/);
  });

  it('happy path: updates dispute + restores RFQ + audits', async () => {
    adminMock.setRows('disputes', [
      { id: 'd-1', rfq_id: 'rfq-1', status: 'open' },
    ]);
    const { adminResolveDisputeAction } = await import('@/app/actions/review');
    const result = await adminResolveDisputeAction({
      disputeId: 'd-1',
      resolution: 'الفريق الفني تأكد من التسليم وفق المواصفات المتفق عليها.',
      inFavorOf: 'supplier',
      refundDecision: 0,
      resumeRfqStatus: 'in_progress',
    });
    expect(result.ok).toBe(true);

    const disputeUpdates = adminMock.getUpdates('disputes');
    expect(disputeUpdates[0].values).toMatchObject({
      status: 'resolved',
      resolution_in_favor_of: 'supplier',
      resolved_by: 'admin-1',
    });

    const rfqUpdates = adminMock.getUpdates('rfqs');
    expect(rfqUpdates[0].values).toMatchObject({ status: 'in_progress' });

    const audits = adminMock.getInserts('audit_logs');
    expect(audits.length).toBe(1);
    expect(audits[0]).toMatchObject({
      action: 'dispute_resolved',
      resource_id: 'd-1',
    });
    expect((audits[0].metadata as { in_favor_of: string }).in_favor_of).toBe(
      'supplier'
    );
  });

  it('records refund amount in audit metadata', async () => {
    adminMock.setRows('disputes', [
      { id: 'd-1', rfq_id: 'rfq-1', status: 'open' },
    ]);
    const { adminResolveDisputeAction } = await import('@/app/actions/review');
    await adminResolveDisputeAction({
      disputeId: 'd-1',
      resolution: 'a'.repeat(50),
      inFavorOf: 'client',
      refundDecision: 25000,
      resumeRfqStatus: 'cancelled',
    });
    const audits = adminMock.getInserts('audit_logs');
    expect((audits[0].metadata as { refund: number }).refund).toBe(25000);
  });

  it('PG error on update is mapped', async () => {
    adminMock.setRows('disputes', [
      { id: 'd-1', rfq_id: 'rfq-1', status: 'open' },
    ]);
    adminMock.setError('disputes', 'update', {
      code: '42501',
      message: 'permission denied',
    });
    const { adminResolveDisputeAction } = await import('@/app/actions/review');
    const result = await adminResolveDisputeAction({
      disputeId: 'd-1',
      resolution: 'a'.repeat(50),
      inFavorOf: 'shared',
      resumeRfqStatus: 'in_progress',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/صلاحية/);
  });
});

describe('openDisputeAction now writes audit log', () => {
  it('records dispute_opened with category', async () => {
    supabaseMock.setUser({ id: 'usr-1' });
    supabaseMock.setRows('profiles', [{ id: 'usr-1', role: 'client' }]);
    const { openDisputeAction } = await import('@/app/actions/review');
    const fd = new FormData();
    fd.set('rfqId', 'rfq-1');
    fd.set('category', 'quality');
    fd.set('description', 'a'.repeat(50));
    await openDisputeAction(null, fd);

    const audits = adminMock.getInserts('audit_logs');
    expect(audits.length).toBe(1);
    expect(audits[0]).toMatchObject({
      action: 'dispute_opened',
      resource_id: 'rfq-1',
    });
    expect((audits[0].metadata as { category: string }).category).toBe(
      'quality'
    );
  });
});
