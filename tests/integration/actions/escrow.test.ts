/**
 * Integration tests for app/actions/escrow.ts.
 *
 * Focus: the URL-safety gate we wired in round 5 (isSafeHttpsUrl) must
 * actually reject dangerous URLs at the action boundary. Also exercises
 * the auth gate, status-machine guards, and admin-only paths.
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
vi.mock('@/lib/auth/require-role', () => ({
  requireRole: () =>
    Promise.resolve({ user: supabaseMock.store.authUser, role: 'admin' }),
}));

beforeEach(() => {
  supabaseMock = createSupabaseMock();
  adminMock = createSupabaseMock();
  vi.resetModules();
});

describe('uploadInitialReceiptAction — auth gate', () => {
  it('rejects unauthenticated user', async () => {
    const { uploadInitialReceiptAction } = await import('@/app/actions/escrow');
    const fd = new FormData();
    fd.set('escrowId', 'esc-1');
    fd.set('receiptUrl', 'https://drive.google.com/file/abc');
    const result = await uploadInitialReceiptAction(null, fd);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/تسجيل الدخول/);
  });
});

describe('uploadInitialReceiptAction — URL safety gate', () => {
  beforeEach(() => {
    supabaseMock.setUser({ id: 'usr-1' });
  });

  it('rejects javascript: scheme', async () => {
    const { uploadInitialReceiptAction } = await import('@/app/actions/escrow');
    const fd = new FormData();
    fd.set('escrowId', 'esc-1');
    fd.set('receiptUrl', 'javascript:alert(1)');
    const result = await uploadInitialReceiptAction(null, fd);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/HTTPS عام/);
  });

  it('rejects data: scheme', async () => {
    const { uploadInitialReceiptAction } = await import('@/app/actions/escrow');
    const fd = new FormData();
    fd.set('escrowId', 'esc-1');
    fd.set('receiptUrl', 'data:text/html,<script>x</script>');
    const result = await uploadInitialReceiptAction(null, fd);
    expect(result.ok).toBe(false);
  });

  it('rejects file: scheme', async () => {
    const { uploadInitialReceiptAction } = await import('@/app/actions/escrow');
    const fd = new FormData();
    fd.set('escrowId', 'esc-1');
    fd.set('receiptUrl', 'file:///etc/passwd');
    const result = await uploadInitialReceiptAction(null, fd);
    expect(result.ok).toBe(false);
  });

  it('rejects plain http (https-only required)', async () => {
    const { uploadInitialReceiptAction } = await import('@/app/actions/escrow');
    const fd = new FormData();
    fd.set('escrowId', 'esc-1');
    fd.set('receiptUrl', 'http://example.sa/receipt.png');
    const result = await uploadInitialReceiptAction(null, fd);
    expect(result.ok).toBe(false);
  });

  it('rejects localhost', async () => {
    const { uploadInitialReceiptAction } = await import('@/app/actions/escrow');
    const fd = new FormData();
    fd.set('escrowId', 'esc-1');
    fd.set('receiptUrl', 'https://localhost:3000/receipt');
    const result = await uploadInitialReceiptAction(null, fd);
    expect(result.ok).toBe(false);
  });

  it('rejects 169.254.169.254 cloud-metadata target', async () => {
    const { uploadInitialReceiptAction } = await import('@/app/actions/escrow');
    const fd = new FormData();
    fd.set('escrowId', 'esc-1');
    fd.set('receiptUrl', 'https://169.254.169.254/latest/meta-data/');
    const result = await uploadInitialReceiptAction(null, fd);
    expect(result.ok).toBe(false);
  });

  it('rejects RFC1918 192.168.x.x', async () => {
    const { uploadInitialReceiptAction } = await import('@/app/actions/escrow');
    const fd = new FormData();
    fd.set('escrowId', 'esc-1');
    fd.set('receiptUrl', 'https://192.168.1.1/admin');
    const result = await uploadInitialReceiptAction(null, fd);
    expect(result.ok).toBe(false);
  });

  it('rejects empty URL', async () => {
    const { uploadInitialReceiptAction } = await import('@/app/actions/escrow');
    const fd = new FormData();
    fd.set('escrowId', 'esc-1');
    fd.set('receiptUrl', '');
    const result = await uploadInitialReceiptAction(null, fd);
    expect(result.ok).toBe(false);
  });

  it('rejects missing escrowId', async () => {
    const { uploadInitialReceiptAction } = await import('@/app/actions/escrow');
    const fd = new FormData();
    fd.set('receiptUrl', 'https://drive.google.com/file');
    const result = await uploadInitialReceiptAction(null, fd);
    expect(result.ok).toBe(false);
  });

  it('passes the gate for valid HTTPS Drive link', async () => {
    adminMock.setRows('escrow_transactions', [
      {
        id: 'esc-1',
        rfq_id: 'rfq-1',
        agreement_id: 'ag-1',
        status: 'awaiting_deposit',
        agreement: { client_id: 'usr-1' },
      },
    ]);
    const { uploadInitialReceiptAction } = await import('@/app/actions/escrow');
    const fd = new FormData();
    fd.set('escrowId', 'esc-1');
    fd.set('receiptUrl', 'https://drive.google.com/file/abc');
    const result = await uploadInitialReceiptAction(null, fd);
    expect(result.ok).toBe(true);
  });
});

describe('approveDeliveryAction', () => {
  it('rejects unauthenticated', async () => {
    const { approveDeliveryAction } = await import('@/app/actions/escrow');
    const result = await approveDeliveryAction('rfq-1');
    expect(result.ok).toBe(false);
  });

  it('rejects when caller is not the RFQ client', async () => {
    supabaseMock.setUser({ id: 'usr-attacker' });
    adminMock.setRows('rfqs', [
      { id: 'rfq-1', client_id: 'usr-owner', status: 'delivered' },
    ]);
    const { approveDeliveryAction } = await import('@/app/actions/escrow');
    const result = await approveDeliveryAction('rfq-1');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/صلاحية/);
  });

  it('rejects when status is not "delivered"', async () => {
    supabaseMock.setUser({ id: 'usr-1' });
    adminMock.setRows('rfqs', [
      { id: 'rfq-1', client_id: 'usr-1', status: 'in_progress' },
    ]);
    const { approveDeliveryAction } = await import('@/app/actions/escrow');
    const result = await approveDeliveryAction('rfq-1');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/الحالة الحالية/);
  });
});
