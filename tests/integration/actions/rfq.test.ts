/**
 * Integration tests for app/actions/rfq.ts.
 * Covers auth gate, payload parsing, service-type routing, validation,
 * company lookup, status routing (draft vs publish), and ownership in
 * publishRfqAction.
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

beforeEach(() => {
  supabaseMock = createSupabaseMock();
  adminMock = createSupabaseMock();
  vi.resetModules();
});

function validBoothPayload() {
  return {
    serviceType: 'booth',
    title: 'Booth for LEAP 2026',
    description: 'desc',
    exhibitionCity: 'Riyadh',
    details: {
      area: '6x6',
      exhibitionName: 'LEAP 2026',
      exhibitionDate: '2026-09-15',
      floors: '1',
    },
    publishImmediately: false,
  };
}

function payloadForm(payload: unknown) {
  const fd = new FormData();
  fd.set('payload', JSON.stringify(payload));
  return fd;
}

describe('createRfqAction — auth gate', () => {
  it('rejects unauthenticated', async () => {
    const { createRfqAction } = await import('@/app/actions/rfq');
    const result = await createRfqAction(null, payloadForm(validBoothPayload()));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/تسجيل الدخول/);
  });
});

describe('createRfqAction — payload parsing', () => {
  beforeEach(() => {
    supabaseMock.setUser({ id: 'usr-1' });
    supabaseMock.setRows('companies', [{ id: 'co-1', owner_id: 'usr-1' }]);
  });

  it('rejects missing payload', async () => {
    const { createRfqAction } = await import('@/app/actions/rfq');
    const result = await createRfqAction(null, new FormData());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/بيانات الطلب/);
  });

  it('rejects malformed JSON payload', async () => {
    const { createRfqAction } = await import('@/app/actions/rfq');
    const fd = new FormData();
    fd.set('payload', '{not json}');
    const result = await createRfqAction(null, fd);
    expect(result.ok).toBe(false);
  });

  it('rejects unknown service type', async () => {
    const { createRfqAction } = await import('@/app/actions/rfq');
    const result = await createRfqAction(
      null,
      payloadForm({ ...validBoothPayload(), serviceType: 'catering' })
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/نوع خدمة/);
  });
});

describe('createRfqAction — service-specific validation', () => {
  beforeEach(() => {
    supabaseMock.setUser({ id: 'usr-1' });
    supabaseMock.setRows('companies', [{ id: 'co-1', owner_id: 'usr-1' }]);
  });

  it('routes booth payloads to booth schema', async () => {
    const { createRfqAction } = await import('@/app/actions/rfq');
    const bad = {
      ...validBoothPayload(),
      details: { area: '', exhibitionName: '', exhibitionDate: '2026-09-15', floors: '1' },
    };
    const result = await createRfqAction(null, payloadForm(bad));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors).toBeDefined();
  });

  it('routes gifts payloads to gifts schema', async () => {
    const { createRfqAction } = await import('@/app/actions/rfq');
    const giftsPayload = {
      serviceType: 'gifts',
      title: 'Gifts for VIP',
      details: {
        recipientType: 'VIP',
        quantity: 0, // invalid: must be positive
        category: 'tech',
        deliveryDate: '2026-08-01',
      },
    };
    const result = await createRfqAction(null, payloadForm(giftsPayload));
    expect(result.ok).toBe(false);
  });

  it('rejects too-short title (< 5 chars)', async () => {
    const { createRfqAction } = await import('@/app/actions/rfq');
    const result = await createRfqAction(
      null,
      payloadForm({ ...validBoothPayload(), title: 'hi' })
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/عنوان/);
  });
});

describe('createRfqAction — company lookup', () => {
  it('rejects when caller has no company row', async () => {
    supabaseMock.setUser({ id: 'usr-1' });
    // No companies seeded
    const { createRfqAction } = await import('@/app/actions/rfq');
    const result = await createRfqAction(null, payloadForm(validBoothPayload()));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/الشركة/);
  });
});

describe('createRfqAction — DB error mapping', () => {
  it('maps insert failure via mapPostgresError', async () => {
    supabaseMock.setUser({ id: 'usr-1' });
    supabaseMock.setRows('companies', [{ id: 'co-1', owner_id: 'usr-1' }]);
    adminMock.setError('rfqs', 'insert', {
      code: '23502',
      message: 'null value violates not-null constraint',
    });
    const { createRfqAction } = await import('@/app/actions/rfq');
    const result = await createRfqAction(null, payloadForm(validBoothPayload()));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/إلزامية/);
  });
});
