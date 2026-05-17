// Helpers for the `supplier-docs` private bucket. Stored values in the
// `suppliers` columns are either a storage object path (preferred, from
// post-Round-3 uploads) or a full https URL (legacy, from manual seeding).
// We treat any string starting with http(s) as an external URL and pass
// through; otherwise we mint a signed URL on demand.

import { createAdminClient } from '@/lib/supabase/admin';

export const SUPPLIER_DOCS_BUCKET = 'supplier-docs';
export const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

export type SupplierDocField = 'cr' | 'vat' | 'portfolio';

export const SUPPLIER_DOC_COLUMN: Record<SupplierDocField, string> = {
  cr: 'cr_document_url',
  vat: 'vat_document_url',
  portfolio: 'portfolio_pdf_url',
};

export const SUPPLIER_DOC_LABEL_AR: Record<SupplierDocField, string> = {
  cr: 'السجل التجاري',
  vat: 'الشهادة الضريبية',
  portfolio: 'ملف الأعمال السابقة',
};

export function isExternalUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  return value.startsWith('http://') || value.startsWith('https://');
}

export async function getSignedSupplierDocUrl(
  storedValue: string | null | undefined
): Promise<string | null> {
  if (!storedValue) return null;
  if (isExternalUrl(storedValue)) return storedValue;

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(SUPPLIER_DOCS_BUCKET)
    .createSignedUrl(storedValue, SIGNED_URL_TTL_SECONDS);

  if (error || !data) return null;
  return data.signedUrl;
}
