import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';

// Admin client uses the service-role key and bypasses RLS. We intentionally
// don't bind generated Database types here because admin operations often
// touch many tables across the app — keeping it loose lets server-actions
// own column-level shapes without round-tripping through generated types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AdminSupabase = SupabaseClient<any, 'public', any>;

export function createAdminClient(): AdminSupabase {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
