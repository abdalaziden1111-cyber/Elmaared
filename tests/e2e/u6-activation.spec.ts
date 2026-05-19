// Phase U6 — capture screenshots of every Sprint 1-6 component live in
// the seeded demo. The goal is a visual audit trail: each spec opens
// the relevant page, waits for hydration, and saves a screenshot under
// ai-documents/UI-ACTIVATION-SCREENSHOTS/<persona>/<feature>.png.
//
// Pre-reqs (all must be done before this spec runs):
//   1. Migrations applied via Z2-apply-all.sql                 (Phase U1)
//   2. Demo data seeded via `pnpm demo:seed`                   (Phase U2)
//   3. All feature flags ON in .env.local                      (Phase U3)
//   4. The dev or built server is running on http://localhost:3000
//
// Tag: @needs-db — skipped in the no-db Playwright run.

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { test, expect } from './fixtures/auth';

const SCREENSHOT_DIR = join(
  process.cwd(),
  'ai-documents',
  'UI-ACTIVATION-SCREENSHOTS',
);

function snapPath(persona: string, feature: string): string {
  const dir = join(SCREENSHOT_DIR, persona);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return join(dir, `${feature}.png`);
}

// Look up the demo IDs once via service role — the seed assigns random
// UUIDs each run, so we discover them rather than hardcoding.
interface DemoFixtures {
  openRfqId: string | null;
  escrowRfqId: string | null;
  invoiceId: string | null;
  conciergeSupplierId: string | null;
}

let demo: DemoFixtures = {
  openRfqId: null,
  escrowRfqId: null,
  invoiceId: null,
  conciergeSupplierId: null,
};

test.beforeAll(async () => {
  const envText = readFileSync(
    join(process.cwd(), '.env.local'),
    'utf8',
  );
  const env = Object.fromEntries(
    envText
      .split('\n')
      .filter((l) => l && !l.startsWith('#') && l.includes('='))
      .map((l) => {
        const i = l.indexOf('=');
        return [
          l.slice(0, i).trim(),
          l.slice(i + 1).trim().replace(/^"|"$/g, ''),
        ];
      }),
  );
  const sb = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: rfqs } = await sb
    .from('rfqs')
    .select('id, rfq_number, status')
    .like('rfq_number', 'RFQ-DEMO-%');
  const rfqRows = (rfqs ?? []) as Array<{
    id: string;
    rfq_number: string;
    status: string;
  }>;
  demo.openRfqId =
    rfqRows.find((r) => r.rfq_number.startsWith('RFQ-DEMO-OPEN'))?.id ?? null;
  demo.escrowRfqId =
    rfqRows.find((r) => r.rfq_number.startsWith('RFQ-DEMO-ESC'))?.id ?? null;

  const { data: invs } = await sb
    .from('invoices')
    .select('id')
    .like('invoice_number', 'INV-DEMO-%')
    .limit(1);
  demo.invoiceId = (invs?.[0] as { id: string } | undefined)?.id ?? null;

  const { data: sups } = await sb
    .from('suppliers')
    .select('id')
    .eq('is_concierge_managed', true)
    .limit(1);
  demo.conciergeSupplierId = (sups?.[0] as { id: string } | undefined)?.id ?? null;
});

test.describe('@needs-db Phase U6 — UI activation screenshots', () => {
  test('client: dashboard with KPIs + celebration trigger', async ({ clientPage }) => {
    await clientPage.goto('/ar/dashboard');
    await clientPage.waitForLoadState('networkidle');
    await clientPage.screenshot({
      path: snapPath('client', 'dashboard'),
      fullPage: true,
    });
    await expect(clientPage).toHaveURL(/\/ar\/dashboard/);
  });

  test('client: discover list (with concierge badge)', async ({ clientPage }) => {
    await clientPage.goto('/ar/discover');
    await clientPage.waitForLoadState('networkidle');
    await clientPage.screenshot({
      path: snapPath('client', 'discover-list'),
      fullPage: true,
    });
  });

  test('client: discover supplier detail (IdentityBadges full)', async ({
    clientPage,
  }) => {
    if (!demo.conciergeSupplierId) test.skip(true, 'No concierge supplier seeded');
    await clientPage.goto(`/ar/discover/${demo.conciergeSupplierId}`);
    await clientPage.waitForLoadState('networkidle');
    await clientPage.screenshot({
      path: snapPath('client', 'discover-supplier-detail'),
      fullPage: true,
    });
  });

  test('client: RFQ compare (ConfidenceBadge + MarketRange + AIFallback)', async ({
    clientPage,
  }) => {
    if (!demo.openRfqId) test.skip(true, 'No open demo RFQ seeded');
    await clientPage.goto(`/ar/dashboard/rfqs/${demo.openRfqId}/compare`);
    await clientPage.waitForLoadState('networkidle');
    await clientPage.screenshot({
      path: snapPath('client', 'compare-ai-stack'),
      fullPage: true,
    });
  });

  test('client: RFQ new (single-screen + Smart Defaults)', async ({ clientPage }) => {
    await clientPage.goto('/ar/dashboard/rfqs/new');
    await clientPage.waitForLoadState('networkidle');
    await clientPage.screenshot({
      path: snapPath('client', 'rfq-new-single-screen'),
      fullPage: true,
    });
  });

  test('client: project execution page (LiveTimeline)', async ({ clientPage }) => {
    if (!demo.escrowRfqId) test.skip(true, 'No escrow demo RFQ seeded');
    await clientPage.goto(`/ar/dashboard/rfqs/${demo.escrowRfqId}/project`);
    await clientPage.waitForLoadState('networkidle');
    await clientPage.screenshot({
      path: snapPath('client', 'project-execution'),
      fullPage: true,
    });
  });

  test('client: day-of event console (PrayerTimesWidget)', async ({ clientPage }) => {
    if (!demo.escrowRfqId) test.skip(true, 'No escrow demo RFQ seeded');
    await clientPage.goto(`/ar/dashboard/rfqs/${demo.escrowRfqId}/event-day`);
    await clientPage.waitForLoadState('networkidle');
    await clientPage.screenshot({
      path: snapPath('client', 'event-day-console'),
      fullPage: true,
    });
  });

  test('client: escrow + TrustBar + ZATCA receipt', async ({ clientPage }) => {
    if (!demo.escrowRfqId) test.skip(true, 'No escrow demo RFQ seeded');
    await clientPage.goto(`/ar/dashboard/rfqs/${demo.escrowRfqId}/escrow`);
    await clientPage.waitForLoadState('networkidle');
    await clientPage.screenshot({
      path: snapPath('client', 'escrow-with-trustbar-zatca'),
      fullPage: true,
    });
  });

  test('client: invoice with ZATCA QR', async ({ clientPage }) => {
    if (!demo.invoiceId) test.skip(true, 'No invoice seeded');
    await clientPage.goto(`/ar/dashboard/invoices/${demo.invoiceId}`);
    await clientPage.waitForLoadState('networkidle');
    await clientPage.screenshot({
      path: snapPath('client', 'invoice-zatca'),
      fullPage: true,
    });
  });

  test('client: settings profile (HijriToggle + NumeralsToggle)', async ({
    clientPage,
  }) => {
    await clientPage.goto('/ar/dashboard/settings/profile');
    await clientPage.waitForLoadState('networkidle');
    await clientPage.screenshot({
      path: snapPath('client', 'settings-cultural-toggles'),
      fullPage: true,
    });
  });

  test('supplier: proposals list', async ({ supplierPage }) => {
    await supplierPage.goto('/ar/supplier/proposals');
    await supplierPage.waitForLoadState('networkidle');
    await supplierPage.screenshot({
      path: snapPath('supplier', 'proposals-list'),
      fullPage: true,
    });
  });

  test('admin: pending agreements page', async ({ adminPage }) => {
    await adminPage.goto('/admin/agreements/pending');
    await adminPage.waitForLoadState('networkidle');
    await adminPage.screenshot({
      path: snapPath('admin', 'pending-agreements'),
      fullPage: true,
    });
  });

  test('public: AI bias-disclosure page', async ({ page }) => {
    await page.goto('/ar/legal/ai-models');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: snapPath('public', 'legal-ai-models'),
      fullPage: true,
    });
  });

  test('public: discover (PDPL banner on first visit)', async ({ page }) => {
    // Fresh context — no localStorage = banner should render
    await page.goto('/ar/discover');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: snapPath('public', 'discover-pdpl-banner'),
      fullPage: true,
    });
  });
});
