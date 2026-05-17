/**
 * Integration tests for the admin-side escrow actions: deposit confirmation,
 * delivery submission, and supplier release.
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

describe('adminConfirmInitialDepositAction', () => {
  it('rejects when escrow not found', async () => {
    requireRoleMock.mockResolvedValue({ user: { id: 'admin-1' }, role: 'admin' });
    const { adminConfirmInitialDepositAction } = await import(
      '@/app/actions/escrow'
    );
    const result = await adminConfirmInitialDepositAction('esc-missing');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/لم نجد/);
  });

  it('rejects when status is not deposit_received', async () => {
    requireRoleMock.mockResolvedValue({ user: { id: 'admin-1' }, role: 'admin' });
    adminMock.setRows('escrow_transactions', [
      {
        id: 'esc-1',
        rfq_id: 'rfq-1',
        status: 'awaiting_deposit',
        initial_deposit: 50000,
      },
    ]);
    const { adminConfirmInitialDepositAction } = await import(
      '@/app/actions/escrow'
    );
    const result = await adminConfirmInitialDepositAction('esc-1');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/حالة|الحالية/);
  });

  it('happy path: marks escrow confirmed + writes event (RFQ already in_progress in evidence-only mode)', async () => {
    requireRoleMock.mockResolvedValue({ user: { id: 'admin-1' }, role: 'admin' });
    adminMock.setRows('escrow_transactions', [
      {
        id: 'esc-1',
        rfq_id: 'rfq-1',
        status: 'deposit_received',
        initial_deposit: 50000,
      },
    ]);
    const { adminConfirmInitialDepositAction } = await import(
      '@/app/actions/escrow'
    );
    const result = await adminConfirmInitialDepositAction('esc-1');
    expect(result.ok).toBe(true);

    // escrow → work_in_progress
    const escrowUpdates = adminMock.getUpdates('escrow_transactions');
    expect(escrowUpdates[0].values).toMatchObject({
      status: 'work_in_progress',
      initial_deposit_confirmed_by: 'admin-1',
    });

    // RFQ status untouched — already in_progress from signAgreementAction
    const rfqUpdates = adminMock.getUpdates('rfqs');
    expect(rfqUpdates).toHaveLength(0);

    // escrow_event written
    const events = adminMock.getInserts('escrow_events');
    expect(events.length).toBe(1);
    expect(events[0]).toMatchObject({
      event_type: 'deposit_confirmed',
      amount: 50000,
      actor_role: 'admin',
    });
  });
});

describe('submitDeliveryAction', () => {
  function validForm(): FormData {
    const fd = new FormData();
    fd.set('rfqId', 'rfq-1');
    fd.set('notes', 'تم التسليم على الموعد');
    fd.set('photos', JSON.stringify(['https://drive.google.com/photo1']));
    return fd;
  }

  it('rejects unauthenticated', async () => {
    const { submitDeliveryAction } = await import('@/app/actions/escrow');
    const result = await submitDeliveryAction(null, validForm());
    expect(result.ok).toBe(false);
  });

  it('rejects empty photos array', async () => {
    supabaseMock.setUser({ id: 'usr-supplier' });
    const { submitDeliveryAction } = await import('@/app/actions/escrow');
    const fd = validForm();
    fd.set('photos', '[]');
    const result = await submitDeliveryAction(null, fd);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/صورة واحدة/);
  });

  it('rejects malformed photos JSON', async () => {
    supabaseMock.setUser({ id: 'usr-supplier' });
    const { submitDeliveryAction } = await import('@/app/actions/escrow');
    const fd = validForm();
    fd.set('photos', '{not json}');
    const result = await submitDeliveryAction(null, fd);
    expect(result.ok).toBe(false);
  });

  it('rejects when RFQ not found or no winning proposal', async () => {
    supabaseMock.setUser({ id: 'usr-supplier' });
    const { submitDeliveryAction } = await import('@/app/actions/escrow');
    const result = await submitDeliveryAction(null, validForm());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/لم نجد المشروع/);
  });

  it('rejects when RFQ status is not in_progress', async () => {
    supabaseMock.setUser({ id: 'usr-supplier' });
    adminMock.setRows('rfqs', [
      {
        id: 'rfq-1',
        status: 'awarded',
        winning_proposal_id: 'prop-1',
      },
    ]);
    const { submitDeliveryAction } = await import('@/app/actions/escrow');
    const result = await submitDeliveryAction(null, validForm());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/حالة|الحالية/);
  });

  it('rejects when caller is not the winning supplier', async () => {
    supabaseMock.setUser({ id: 'usr-attacker' });
    adminMock.setRows('rfqs', [
      {
        id: 'rfq-1',
        status: 'in_progress',
        winning_proposal_id: 'prop-1',
      },
    ]);
    adminMock.setRows('proposals', [
      { id: 'prop-1', supplier_id: 'sup-real' },
    ]);
    adminMock.setRows('suppliers', [
      { id: 'sup-attacker', owner_id: 'usr-attacker' },
    ]);
    const { submitDeliveryAction } = await import('@/app/actions/escrow');
    const result = await submitDeliveryAction(null, validForm());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/صلاحية/);
  });
});

describe('adminReleaseToSupplierAction', () => {
  it('rejects too-short payout reference', async () => {
    requireRoleMock.mockResolvedValue({ user: { id: 'admin-1' }, role: 'admin' });
    const { adminReleaseToSupplierAction } = await import(
      '@/app/actions/escrow'
    );
    const result = await adminReleaseToSupplierAction('esc-1', 'a');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/مرجع/);
  });

  it('rejects when escrow not found', async () => {
    requireRoleMock.mockResolvedValue({ user: { id: 'admin-1' }, role: 'admin' });
    const { adminReleaseToSupplierAction } = await import(
      '@/app/actions/escrow'
    );
    const result = await adminReleaseToSupplierAction('esc-missing', 'PAYOUT-2026-001');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/لم نجد/);
  });

  it('rejects when status is not final_payment', async () => {
    requireRoleMock.mockResolvedValue({ user: { id: 'admin-1' }, role: 'admin' });
    adminMock.setRows('escrow_transactions', [
      {
        id: 'esc-1',
        rfq_id: 'rfq-1',
        status: 'work_in_progress',
        supplier_net: 48500,
      },
    ]);
    const { adminReleaseToSupplierAction } = await import(
      '@/app/actions/escrow'
    );
    const result = await adminReleaseToSupplierAction('esc-1', 'PAYOUT-2026-001');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/حالة|الحالية/);
  });

  it('happy path: marks released + RFQ completed + emits event', async () => {
    requireRoleMock.mockResolvedValue({ user: { id: 'admin-1' }, role: 'admin' });
    adminMock.setRows('escrow_transactions', [
      {
        id: 'esc-1',
        rfq_id: 'rfq-1',
        status: 'final_payment',
        supplier_net: 48500,
      },
    ]);
    const { adminReleaseToSupplierAction } = await import(
      '@/app/actions/escrow'
    );
    const result = await adminReleaseToSupplierAction('esc-1', 'PAYOUT-2026-001');
    expect(result.ok).toBe(true);

    const escrowUpdates = adminMock.getUpdates('escrow_transactions');
    expect(escrowUpdates[0].values).toMatchObject({
      status: 'released',
      released_by: 'admin-1',
      release_transaction_ref: 'PAYOUT-2026-001',
    });

    const rfqUpdates = adminMock.getUpdates('rfqs');
    expect(rfqUpdates[0].values).toMatchObject({ status: 'completed' });

    const events = adminMock.getInserts('escrow_events');
    expect(events[0]).toMatchObject({
      event_type: 'released_to_supplier',
      bank_reference: 'PAYOUT-2026-001',
    });
  });
});
