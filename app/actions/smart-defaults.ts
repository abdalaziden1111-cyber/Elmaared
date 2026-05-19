'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  suggestRfqDefaults,
  type SmartDefaults,
  type SmartDefaultsServiceType,
} from '@/lib/rfq/smart-defaults';
import { log } from '@/lib/utils/logger';

// UX Plan v2 Decision #02 (S2.4) — server-side companion to the
// SingleScreenView. The client calls this when the user picks a service
// type; we pull the 12-month price history for that service, run it
// through the pure helper, and hand back a suggestion the UI can offer.
//
// Validation:
// - Caller must be authenticated (only buyers / clients use the RFQ form).
// - service_type is restricted to the four known enum values.
// - Returns `null` on any error so the UI degrades silently to the
//   static-fallback path rather than blocking submission.

const MARKET_LOOKBACK_MS = 365 * 24 * 60 * 60 * 1000;
const VALID_SERVICES = new Set<SmartDefaultsServiceType>([
  'booth',
  'gifts',
  'event',
  'printing',
]);

export async function getRfqSmartDefaultsAction(
  serviceType: string,
): Promise<SmartDefaults | null> {
  if (!VALID_SERVICES.has(serviceType as SmartDefaultsServiceType)) {
    return null;
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  try {
    const since = new Date(Date.now() - MARKET_LOOKBACK_MS).toISOString();
    const { data } = await admin
      .from('proposals')
      .select('total_price, rfqs!inner(service_type)')
      .eq('rfqs.service_type', serviceType)
      .neq('status', 'withdrawn')
      .gte('created_at', since)
      .limit(500);

    const rows = (data ?? []) as Array<{
      total_price: number | string | null;
    }>;
    const prices: number[] = [];
    for (const r of rows) {
      const n =
        typeof r.total_price === 'string'
          ? Number(r.total_price)
          : r.total_price;
      if (typeof n === 'number' && Number.isFinite(n) && n > 0) {
        prices.push(n);
      }
    }

    return suggestRfqDefaults({
      serviceType: serviceType as SmartDefaultsServiceType,
      prices,
    });
  } catch (err) {
    log.error('smart_defaults.failed', err, { service_type: serviceType });
    // Degrade silently — caller treats null as "use static fallback or skip".
    return null;
  }
}
