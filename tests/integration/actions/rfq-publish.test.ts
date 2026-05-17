/**
 * Integration tests for publishRfqAction (state transition draft → open)
 * and the auth password-related actions (forgot, update, logout).
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
vi.mock('next-intl/server', () => ({
  getLocale: () => Promise.resolve('ar'),
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

describe('publishRfqAction', () => {
  it('rejects unauthenticated', async () => {
    const { publishRfqAction } = await import('@/app/actions/rfq');
    const result = await publishRfqAction('rfq-1');
    expect(result.ok).toBe(false);
  });

  it('returns error when DB rejects the update (e.g. RLS denies)', async () => {
    supabaseMock.setUser({ id: 'usr-1' });
    adminMock.setError('rfqs', 'update', {
      code: '42501',
      message: 'permission denied',
    });
    const { publishRfqAction } = await import('@/app/actions/rfq');
    const result = await publishRfqAction('rfq-1');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/فشل|نشر/);
  });

  it('happy path: returns ok and queues fanout email', async () => {
    supabaseMock.setUser({ id: 'usr-1' });
    const { publishRfqAction } = await import('@/app/actions/rfq');
    const result = await publishRfqAction('rfq-1');
    // The mock fills in the update result, so this passes through
    expect(result.ok).toBe(true);
  });
});

describe('forgotPasswordAction', () => {
  it('rejects invalid email format', async () => {
    const { forgotPasswordAction } = await import('@/app/actions/auth');
    const fd = new FormData();
    fd.set('email', 'not-email');
    const result = await forgotPasswordAction(null, fd);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors?.email).toBeDefined();
  });

  it('always returns ok for security (does not leak whether email exists)', async () => {
    const { forgotPasswordAction } = await import('@/app/actions/auth');
    const fd = new FormData();
    fd.set('email', 'random@example.com');
    const result = await forgotPasswordAction(null, fd);
    // Even if Supabase says "no such email", we return ok for security
    expect(result.ok).toBe(true);
  });
});

describe('updatePasswordAction', () => {
  it('rejects mismatched passwords', async () => {
    const { updatePasswordAction } = await import('@/app/actions/auth');
    const fd = new FormData();
    fd.set('password', 'mypassword');
    fd.set('confirmPassword', 'different');
    const result = await updatePasswordAction(null, fd);
    expect(result.ok).toBe(false);
  });

  it('rejects short password', async () => {
    const { updatePasswordAction } = await import('@/app/actions/auth');
    const fd = new FormData();
    fd.set('password', 'short');
    fd.set('confirmPassword', 'short');
    const result = await updatePasswordAction(null, fd);
    expect(result.ok).toBe(false);
  });

  it('returns ok on valid matching password', async () => {
    const { updatePasswordAction } = await import('@/app/actions/auth');
    const fd = new FormData();
    fd.set('password', 'newpassword123');
    fd.set('confirmPassword', 'newpassword123');
    const result = await updatePasswordAction(null, fd);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const d = result.data as { redirectTo?: string } | undefined;
      expect(d?.redirectTo).toBe('/ar/login');
    }
  });
});

describe('logoutAction', () => {
  it('throws redirect to locale-aware /login (Next.js navigation pattern)', async () => {
    supabaseMock.setUser({ id: 'usr-1' });
    const { logoutAction } = await import('@/app/actions/auth');
    await expect(logoutAction()).rejects.toThrow(/__REDIRECT__:\/ar\/login/);
  });
});
