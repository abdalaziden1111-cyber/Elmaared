/**
 * Integration tests for app/actions/proposal.ts.
 * Covers auth gate, supplier-status check, validation, and PG-error mapping
 * for the unique (rfq_id, supplier_id) constraint.
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
// Mock the AI scorer so the after() callback doesn't hit a real gateway
vi.mock('@/lib/ai/score-proposal', () => ({
  scoreProposal: vi.fn().mockResolvedValue(undefined),
}));

beforeEach(() => {
  supabaseMock = createSupabaseMock();
  adminMock = createSupabaseMock();
  vi.resetModules();
});

function validForm(): FormData {
  const fd = new FormData();
  fd.set('rfqId', 'rfq-1');
  fd.set('totalPrice', '50000');
  fd.set('deliveryDays', '21');
  fd.set('description', 'a'.repeat(50));
  fd.set('scopeOfWork', 'a'.repeat(100));
  fd.set('paymentTerms', '50% upfront, 50% on delivery');
  return fd;
}

function setApprovedSupplier() {
  supabaseMock.setUser({ id: 'usr-supplier' });
  supabaseMock.setRows('suppliers', [
    {
      id: 'sup-1',
      owner_id: 'usr-supplier',
      status: 'approved',
      company_name: 'Test Co',
      average_rating: null,
      total_completed_orders: null,
      years_of_experience: null,
    },
  ]);
}

describe('submitProposalAction — auth & validation', () => {
  it('rejects unauthenticated', async () => {
    const { submitProposalAction } = await import('@/app/actions/proposal');
    const result = await submitProposalAction(null, validForm());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/تسجيل الدخول/);
  });

  it('rejects missing rfqId', async () => {
    setApprovedSupplier();
    const { submitProposalAction } = await import('@/app/actions/proposal');
    const fd = validForm();
    fd.delete('rfqId');
    const result = await submitProposalAction(null, fd);
    expect(result.ok).toBe(false);
  });

  it('rejects validation failure (zero price)', async () => {
    setApprovedSupplier();
    const { submitProposalAction } = await import('@/app/actions/proposal');
    const fd = validForm();
    fd.set('totalPrice', '0');
    const result = await submitProposalAction(null, fd);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors?.totalPrice).toBeDefined();
  });

  it('rejects too-short scope of work', async () => {
    setApprovedSupplier();
    const { submitProposalAction } = await import('@/app/actions/proposal');
    const fd = validForm();
    fd.set('scopeOfWork', 'too short');
    const result = await submitProposalAction(null, fd);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors?.scopeOfWork).toBeDefined();
  });
});

describe('submitProposalAction — supplier status', () => {
  it('rejects when supplier row missing', async () => {
    supabaseMock.setUser({ id: 'usr-x' });
    // No supplier row seeded
    const { submitProposalAction } = await import('@/app/actions/proposal');
    const result = await submitProposalAction(null, validForm());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/مفعّل كمورد/);
  });

  it('rejects pending_review supplier', async () => {
    supabaseMock.setUser({ id: 'usr-pending' });
    supabaseMock.setRows('suppliers', [
      {
        id: 'sup-2',
        owner_id: 'usr-pending',
        status: 'pending_review',
        company_name: 'Pending Co',
        average_rating: null,
        total_completed_orders: null,
        years_of_experience: null,
      },
    ]);
    const { submitProposalAction } = await import('@/app/actions/proposal');
    const result = await submitProposalAction(null, validForm());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/قيد المراجعة/);
  });
});

describe('submitProposalAction — DB errors', () => {
  it('maps duplicate proposal via mapPostgresError', async () => {
    setApprovedSupplier();
    adminMock.setError('proposals', 'insert', {
      code: '23505',
      message:
        'duplicate key value violates unique constraint "proposals_rfq_id_supplier_id_key"',
    });
    const { submitProposalAction } = await import('@/app/actions/proposal');
    const result = await submitProposalAction(null, validForm());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/قدّمت عرضاً/);
  });
});
