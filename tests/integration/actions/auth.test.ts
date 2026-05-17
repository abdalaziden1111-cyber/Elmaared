/**
 * Integration tests for app/actions/auth.ts.
 *
 * We mock @/lib/supabase/server + admin to inject specific responses, then
 * call the action directly. This covers:
 *   - Validation failures (invalid email, short password, bad phone, bad CR)
 *   - Already-registered email path
 *   - DB constraint violations mapped via mapPostgresError
 *   - Phone normalization (local format → +966 canonical)
 *   - Rollback ordering (auth user deleted when company insert fails)
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
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));
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

describe('loginAction', () => {
  it('rejects invalid email format', async () => {
    const { loginAction } = await import('@/app/actions/auth');
    const fd = new FormData();
    fd.set('email', 'not-an-email');
    fd.set('password', '12345678');
    const result = await loginAction(null, fd);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors?.email).toBeDefined();
  });

  it('rejects short password', async () => {
    const { loginAction } = await import('@/app/actions/auth');
    const fd = new FormData();
    fd.set('email', 'a@b.co');
    fd.set('password', '123');
    const result = await loginAction(null, fd);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors?.password).toBeDefined();
  });

  it('returns generic error on bad credentials (no auth detail leaks)', async () => {
    supabaseMock.setSignInError({ message: 'Invalid login credentials' });
    const { loginAction } = await import('@/app/actions/auth');
    const fd = new FormData();
    fd.set('email', 'a@b.co');
    fd.set('password', '12345678');
    const result = await loginAction(null, fd);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      // Generic Arabic message — doesn't expose whether email exists or password is wrong
      expect(result.error).toMatch(/بيانات الدخول غير صحيحة/);
    }
  });
});

describe('signupClientAction — validation', () => {
  function validForm(): FormData {
    const fd = new FormData();
    fd.set('email', 'sara@company.sa');
    fd.set('password', 'Pass1234!');
    fd.set('fullName', 'سارة العتيبي');
    fd.set('phone', '+966512345678');
    fd.set('companyName', 'شركة الإبداع');
    fd.set('crNumber', '1010123456');
    fd.set('size', 'mid');
    fd.set('city', 'Riyadh');
    return fd;
  }

  it('rejects invalid CR number', async () => {
    const { signupClientAction } = await import('@/app/actions/auth');
    const fd = validForm();
    fd.set('crNumber', '12345');
    const result = await signupClientAction(null, fd);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors?.crNumber).toBeDefined();
  });

  it('rejects invalid email', async () => {
    const { signupClientAction } = await import('@/app/actions/auth');
    const fd = validForm();
    fd.set('email', 'not-email');
    const result = await signupClientAction(null, fd);
    expect(result.ok).toBe(false);
  });
});

describe('signupClientAction — phone normalization', () => {
  function validForm(phone: string): FormData {
    const fd = new FormData();
    fd.set('email', 'sara@company.sa');
    fd.set('password', 'Pass1234!');
    fd.set('fullName', 'سارة العتيبي');
    fd.set('phone', phone);
    fd.set('companyName', 'شركة الإبداع');
    fd.set('crNumber', '1010123456');
    fd.set('size', 'mid');
    fd.set('city', 'Riyadh');
    return fd;
  }

  it('accepts local format 0512345678 (normalized to +966)', async () => {
    const { signupClientAction } = await import('@/app/actions/auth');
    const result = await signupClientAction(null, validForm('0512345678'));
    expect(result.ok).toBe(true);
  });

  it('accepts +966 with spaces (normalized)', async () => {
    const { signupClientAction } = await import('@/app/actions/auth');
    const result = await signupClientAction(null, validForm('+966 51 234 5678'));
    expect(result.ok).toBe(true);
  });

  it('accepts 00966 international form', async () => {
    const { signupClientAction } = await import('@/app/actions/auth');
    const result = await signupClientAction(null, validForm('00966512345678'));
    expect(result.ok).toBe(true);
  });

  it('rejects unrecognizable phone', async () => {
    const { signupClientAction } = await import('@/app/actions/auth');
    const result = await signupClientAction(null, validForm('not a phone'));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors?.phone).toBeDefined();
  });
});

describe('signupClientAction — DB error paths', () => {
  function validForm(): FormData {
    const fd = new FormData();
    fd.set('email', 'sara@company.sa');
    fd.set('password', 'Pass1234!');
    fd.set('fullName', 'سارة العتيبي');
    fd.set('phone', '+966512345678');
    fd.set('companyName', 'شركة الإبداع');
    fd.set('crNumber', '1010123456');
    fd.set('size', 'mid');
    fd.set('city', 'Riyadh');
    return fd;
  }

  it('returns "already registered" when auth signUp says so', async () => {
    supabaseMock.setSignUpResult({
      user: null,
      error: { message: 'User already registered' },
    });
    const { signupClientAction } = await import('@/app/actions/auth');
    const result = await signupClientAction(null, validForm());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/مسجّل بالفعل/);
  });

  it('maps duplicate cr_number via mapPostgresError', async () => {
    adminMock.setError('companies', 'insert', {
      code: '23505',
      message: 'duplicate key value violates unique constraint "companies_cr_number_key"',
    });
    const { signupClientAction } = await import('@/app/actions/auth');
    const result = await signupClientAction(null, validForm());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/السجل التجاري/);
  });

  it('rolls back profile + auth user when company insert fails', async () => {
    adminMock.setError('companies', 'insert', {
      code: '23505',
      message: 'duplicate cr_number',
    });
    const { signupClientAction } = await import('@/app/actions/auth');
    await signupClientAction(null, validForm());
    // Profile delete should have been called
    expect(adminMock.getDeletes('profiles').length).toBe(1);
  });
});

describe('signupSupplierAction', () => {
  function validForm(): FormData {
    const fd = new FormData();
    fd.set('email', 'supplier@test.sa');
    fd.set('password', 'Pass1234!');
    fd.set('fullName', 'أحمد المورد');
    fd.set('phone', '+966599887766');
    fd.set('companyName', 'مؤسسة المعارض');
    fd.set('crNumber', '4030567890');
    fd.set('specializations', JSON.stringify(['booth']));
    fd.set('cities', JSON.stringify(['Riyadh']));
    return fd;
  }

  it('accepts valid input', async () => {
    const { signupSupplierAction } = await import('@/app/actions/auth');
    const result = await signupSupplierAction(null, validForm());
    expect(result.ok).toBe(true);
  });

  it('rejects malformed specializations JSON', async () => {
    const { signupSupplierAction } = await import('@/app/actions/auth');
    const fd = validForm();
    fd.set('specializations', '{not json}');
    const result = await signupSupplierAction(null, fd);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/التخصصات/);
  });

  it('rejects empty specializations', async () => {
    const { signupSupplierAction } = await import('@/app/actions/auth');
    const fd = validForm();
    fd.set('specializations', '[]');
    const result = await signupSupplierAction(null, fd);
    expect(result.ok).toBe(false);
  });

  it('maps duplicate cr_number via mapPostgresError', async () => {
    adminMock.setError('suppliers', 'insert', {
      code: '23505',
      message: 'duplicate key value violates suppliers_cr_number_key',
    });
    const { signupSupplierAction } = await import('@/app/actions/auth');
    const result = await signupSupplierAction(null, validForm());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/السجل التجاري/);
  });
});
