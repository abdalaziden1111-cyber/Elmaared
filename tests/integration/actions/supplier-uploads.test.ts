/**
 * Integration tests for uploadSupplierDocAction.
 *
 * Covers: auth gate, field whitelist, file type/size validation, happy path
 * (storage upload + suppliers row update + audit), cleanup on update failure.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupabaseMock } from '@/tests/mocks/supabase-mock';

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

function makeFile(opts: {
  name?: string;
  type: string;
  size: number;
}): File {
  // Build a blob of the requested size; File extends Blob in browser/jsdom.
  const content = new Uint8Array(opts.size);
  const blob = new Blob([content], { type: opts.type });
  return new File([blob], opts.name ?? 'doc.pdf', { type: opts.type });
}

function makeFormData(field: string, file: File | null): FormData {
  const fd = new FormData();
  fd.set('field', field);
  if (file) fd.set('file', file);
  return fd;
}

describe('uploadSupplierDocAction — auth & validation', () => {
  it('rejects when unauthenticated', async () => {
    const { uploadSupplierDocAction } = await import('@/app/actions/supplier-uploads');
    const fd = makeFormData('cr', makeFile({ type: 'application/pdf', size: 1024 }));
    const result = await uploadSupplierDocAction(null, fd);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/تسجيل الدخول/);
  });

  it('rejects unknown field', async () => {
    supabaseMock.setUser({ id: 'user-1' });
    const { uploadSupplierDocAction } = await import('@/app/actions/supplier-uploads');
    const fd = makeFormData('passport', makeFile({ type: 'application/pdf', size: 1024 }));
    const result = await uploadSupplierDocAction(null, fd);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/المستند/);
  });

  it('rejects when no file attached', async () => {
    supabaseMock.setUser({ id: 'user-1' });
    const { uploadSupplierDocAction } = await import('@/app/actions/supplier-uploads');
    const fd = makeFormData('cr', null);
    const result = await uploadSupplierDocAction(null, fd);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/اختيار ملف/);
  });

  it('rejects file larger than 10 MB', async () => {
    supabaseMock.setUser({ id: 'user-1' });
    const { uploadSupplierDocAction } = await import('@/app/actions/supplier-uploads');
    const tooBig = makeFile({ type: 'application/pdf', size: 11 * 1024 * 1024 });
    const fd = makeFormData('cr', tooBig);
    const result = await uploadSupplierDocAction(null, fd);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/10 ميغابايت/);
  });

  it('rejects unsupported MIME type', async () => {
    supabaseMock.setUser({ id: 'user-1' });
    const { uploadSupplierDocAction } = await import('@/app/actions/supplier-uploads');
    const exec = makeFile({ type: 'application/x-msdownload', size: 1024 });
    const fd = makeFormData('cr', exec);
    const result = await uploadSupplierDocAction(null, fd);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/الصيغة/);
  });
});

describe('uploadSupplierDocAction — supplier lookup', () => {
  it('rejects when supplier profile missing', async () => {
    supabaseMock.setUser({ id: 'user-1' });
    // Don't seed suppliers row — lookup returns null
    const { uploadSupplierDocAction } = await import('@/app/actions/supplier-uploads');
    const fd = makeFormData('cr', makeFile({ type: 'application/pdf', size: 1024 }));
    const result = await uploadSupplierDocAction(null, fd);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/ملف المورد/);
  });
});

describe('uploadSupplierDocAction — happy path', () => {
  beforeEach(() => {
    supabaseMock.setUser({ id: 'user-1' });
    adminMock.setRows('suppliers', [
      { id: 'sup-1', owner_id: 'user-1', status: 'approved' },
    ]);
  });

  it('uploads CR doc to user folder and updates suppliers row', async () => {
    const { uploadSupplierDocAction } = await import('@/app/actions/supplier-uploads');
    const file = makeFile({ type: 'application/pdf', size: 5000 });
    const fd = makeFormData('cr', file);

    const result = await uploadSupplierDocAction(null, fd);
    expect(result.ok).toBe(true);

    const uploads = adminMock.getStorageUploads();
    expect(uploads).toHaveLength(1);
    expect(uploads[0].bucket).toBe('supplier-docs');
    expect(uploads[0].path).toMatch(/^user-1\/cr-\d+\.pdf$/);

    const updates = adminMock.getUpdates('suppliers');
    expect(updates.length).toBe(1);
    expect(updates[0].values).toMatchObject({ cr_document_url: uploads[0].path });
  });

  it('writes audit log with field + path in metadata', async () => {
    const { uploadSupplierDocAction } = await import('@/app/actions/supplier-uploads');
    const fd = makeFormData('vat', makeFile({ type: 'image/png', size: 8000 }));
    const result = await uploadSupplierDocAction(null, fd);
    expect(result.ok).toBe(true);

    const audits = adminMock.getInserts('audit_logs');
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({ action: 'supplier_doc_uploaded' });
    const meta = audits[0].metadata as { field: string; path: string };
    expect(meta.field).toBe('vat');
    expect(meta.path).toMatch(/\.png$/);
  });

  it('chooses extension from MIME type (jpg / pdf / png)', async () => {
    const { uploadSupplierDocAction } = await import('@/app/actions/supplier-uploads');
    const jpgFd = makeFormData('portfolio', makeFile({ type: 'image/jpeg', size: 1000 }));
    await uploadSupplierDocAction(null, jpgFd);

    const uploads = adminMock.getStorageUploads();
    expect(uploads[uploads.length - 1].path).toMatch(/\.jpg$/);
  });
});

describe('uploadSupplierDocAction — failure modes', () => {
  beforeEach(() => {
    supabaseMock.setUser({ id: 'user-1' });
    adminMock.setRows('suppliers', [
      { id: 'sup-1', owner_id: 'user-1', status: 'approved' },
    ]);
  });

  it('returns error when storage upload fails (and does NOT update suppliers)', async () => {
    adminMock.setStorageError('supplier-docs', 'upload', {
      message: 'network down',
    });
    const { uploadSupplierDocAction } = await import('@/app/actions/supplier-uploads');
    const fd = makeFormData('cr', makeFile({ type: 'application/pdf', size: 1024 }));
    const result = await uploadSupplierDocAction(null, fd);
    expect(result.ok).toBe(false);

    const updates = adminMock.getUpdates('suppliers');
    expect(updates.length).toBe(0);
  });

  it('cleans up orphaned upload when suppliers update fails', async () => {
    adminMock.setError('suppliers', 'update', {
      code: '23505',
      message: 'conflict',
    });
    const { uploadSupplierDocAction } = await import('@/app/actions/supplier-uploads');
    const fd = makeFormData('cr', makeFile({ type: 'application/pdf', size: 1024 }));
    const result = await uploadSupplierDocAction(null, fd);
    expect(result.ok).toBe(false);

    const removals = adminMock.getStorageRemovals();
    expect(removals).toHaveLength(1);
    expect(removals[0].bucket).toBe('supplier-docs');
  });
});

describe('getSignedSupplierDocUrl helper', () => {
  it('returns null for null input', async () => {
    const { getSignedSupplierDocUrl } = await import('@/lib/storage/supplier-docs');
    expect(await getSignedSupplierDocUrl(null)).toBeNull();
    expect(await getSignedSupplierDocUrl('')).toBeNull();
  });

  it('passes through external https URLs unchanged (legacy support)', async () => {
    const { getSignedSupplierDocUrl } = await import('@/lib/storage/supplier-docs');
    const external = 'https://drive.google.com/file/abc123';
    expect(await getSignedSupplierDocUrl(external)).toBe(external);
  });

  it('mints a signed URL for storage paths', async () => {
    adminMock.setSignedUrl('supplier-docs', 'user-1/cr-12345.pdf', 'https://signed.example/abc');
    const { getSignedSupplierDocUrl } = await import('@/lib/storage/supplier-docs');
    const url = await getSignedSupplierDocUrl('user-1/cr-12345.pdf');
    expect(url).toBe('https://signed.example/abc');
  });
});
