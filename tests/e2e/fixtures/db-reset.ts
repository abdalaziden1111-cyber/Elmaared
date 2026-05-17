/**
 * Idempotent helpers to clean E2E-test data between specs.
 *
 * We do NOT truncate the seeded personas (profiles/suppliers/companies for
 * ahmed/m/sara). Instead we delete only the rows their specs create —
 * RFQs, proposals, chats, messages, agreements, escrow_transactions,
 * notifications belonging to the test personas — so each spec starts
 * with a known-empty workspace for its persona.
 *
 * Uses the service-role key. Never call from app code.
 */
import { createClient } from '@supabase/supabase-js';
import { PERSONAS } from './personas';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function hasTestDb(): boolean {
  return Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);
}

function admin() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error(
      'SUPABASE_URL or SERVICE_ROLE_KEY missing — set them in .env.local or skip @needs-db specs.'
    );
  }
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function getUserIdByEmail(email: string): Promise<string | null> {
  const a = admin();
  const { data, error } = await a.auth.admin.listUsers();
  if (error) return null;
  const u = data?.users?.find((x) => x.email === email);
  return u?.id ?? null;
}

export async function resetClientData(): Promise<void> {
  const clientId = await getUserIdByEmail(PERSONAS.client.email);
  if (!clientId) return;
  const a = admin();
  // Delete in FK-safe order. Each step is best-effort.
  // RFQs cascade to their proposals/chats/messages/agreements/escrow.
  await a.from('notifications').delete().eq('user_id', clientId);
  await a.from('rfqs').delete().eq('client_id', clientId);
}

export async function resetSupplierData(): Promise<void> {
  const supplierUserId = await getUserIdByEmail(PERSONAS.supplier.email);
  if (!supplierUserId) return;
  const a = admin();

  const { data: supplierRow } = await a
    .from('suppliers')
    .select('id')
    .eq('owner_id', supplierUserId)
    .single();
  const supplierId = (supplierRow as { id: string } | null)?.id;

  await a.from('notifications').delete().eq('user_id', supplierUserId);
  if (supplierId) {
    await a.from('proposals').delete().eq('supplier_id', supplierId);
  }
}

export async function resetAdminData(): Promise<void> {
  const adminId = await getUserIdByEmail(PERSONAS.admin.email);
  if (!adminId) return;
  const a = admin();
  await a.from('notifications').delete().eq('user_id', adminId);
}

export async function resetAllPersonaData(): Promise<void> {
  await Promise.all([resetClientData(), resetSupplierData(), resetAdminData()]);
}
