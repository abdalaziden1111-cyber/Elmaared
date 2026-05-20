// Phase W6 — Capture screenshots of every Phase V surface live in the
// seeded demo. Companion to u6-activation.spec.ts; same persona fixture,
// same screenshot directory pattern, different surfaces.
//
// Pre-reqs (all must be done before this spec runs):
//   1. Z2 + Phase V migrations applied                 (Phase U1 + W1)
//   2. Demo data seeded via `pnpm demo:seed`           (Phase U2 + W2)
//   3. All feature flags ON in .env.local              (Phase U3 + W3)
//   4. Dev server running on http://localhost:3000
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
  'W6-SCREENSHOTS',
);

function snapPath(persona: string, feature: string): string {
  const dir = join(SCREENSHOT_DIR, persona);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return join(dir, `${feature}.png`);
}

interface DemoFixtures {
  openRfqId: string | null;
  escrowRfqId: string | null;
  blogSlug: string | null;
  agreementHasRiskyClauses: boolean;
}

const demo: DemoFixtures = {
  openRfqId: null,
  escrowRfqId: null,
  blogSlug: null,
  agreementHasRiskyClauses: false,
};

test.beforeAll(async () => {
  const envText = readFileSync(join(process.cwd(), '.env.local'), 'utf8');
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
      })
  );
  const sb = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Reuse the same demo RFQs that u6 fixture discovers.
  const { data: rfqs } = await sb
    .from('rfqs')
    .select('id, rfq_number')
    .like('rfq_number', 'RFQ-DEMO-%');
  const rows = (rfqs ?? []) as Array<{ id: string; rfq_number: string }>;
  demo.openRfqId =
    rows.find((r) => r.rfq_number.startsWith('RFQ-DEMO-OPEN'))?.id ?? null;
  demo.escrowRfqId =
    rows.find((r) => r.rfq_number.startsWith('RFQ-DEMO-ESC'))?.id ?? null;

  // W2.4 — confirm risky_clauses are populated on the escrow agreement.
  if (demo.escrowRfqId) {
    const { data: agRow } = await sb
      .from('agreements')
      .select('ai_risky_clauses')
      .eq('rfq_id', demo.escrowRfqId)
      .maybeSingle();
    const clauses = (agRow as { ai_risky_clauses: unknown[] | null } | null)
      ?.ai_risky_clauses;
    demo.agreementHasRiskyClauses = Array.isArray(clauses) && clauses.length > 0;
  }

  // W2.8 — pick the published demo post for the slug page screenshot.
  const { data: bp } = await sb
    .from('blog_posts')
    .select('slug')
    .eq('status', 'published')
    .like('slug', 'demo-w2-%')
    .limit(1);
  demo.blogSlug = (bp?.[0] as { slug: string } | undefined)?.slug ?? null;
});

test.describe('@needs-db Phase W6 — Phase V activation screenshots', () => {
  // ── Client persona ──

  test('client: dashboard (W2.1 milestone modal fires for 500k_gmv)', async ({
    clientPage,
  }) => {
    await clientPage.goto('/ar/dashboard');
    await clientPage.waitForLoadState('networkidle');
    await clientPage.screenshot({
      path: snapPath('client', 'dashboard-celebration-modal'),
      fullPage: true,
    });
    await expect(clientPage).toHaveURL(/\/ar\/dashboard/);
  });

  test('client: notifications page (V4.1 — 8 tabs, real-time, bulk actions)', async ({
    clientPage,
  }) => {
    await clientPage.goto('/ar/dashboard/notifications');
    await clientPage.waitForLoadState('networkidle');
    await clientPage.screenshot({
      path: snapPath('client', 'notifications-page'),
      fullPage: true,
    });
    // Confirm at least one tab is visible
    await expect(clientPage.locator('[data-tab="all"]')).toBeVisible();
  });

  test('client: notification preferences page (V4.2)', async ({ clientPage }) => {
    await clientPage.goto('/ar/dashboard/notifications/preferences');
    await clientPage.waitForLoadState('networkidle');
    await clientPage.screenshot({
      path: snapPath('client', 'notifications-preferences'),
      fullPage: true,
    });
  });

  test('client: agreement page renders <RiskyClauses> panel (V1.2 + W4.3 badge)', async ({
    clientPage,
  }) => {
    if (!demo.escrowRfqId)
      test.skip(true, 'No escrow demo RFQ seeded');
    if (!demo.agreementHasRiskyClauses)
      test.skip(true, 'Agreement has no risky_clauses — run pnpm demo:seed');
    await clientPage.goto(`/ar/dashboard/rfqs/${demo.escrowRfqId}/agreement`);
    await clientPage.waitForLoadState('networkidle');
    await clientPage.screenshot({
      path: snapPath('client', 'agreement-risky-clauses'),
      fullPage: true,
    });
    // Confirm the W4.3 badge is visible
    await expect(
      clientPage.getByText(/تحليل قانوني متاح/)
    ).toBeVisible({ timeout: 8000 });
  });

  test('client: public blog list (V5.3 — DB-backed, pagination)', async ({
    clientPage,
  }) => {
    await clientPage.goto('/ar/blog');
    await clientPage.waitForLoadState('networkidle');
    await clientPage.screenshot({
      path: snapPath('client', 'blog-list'),
      fullPage: true,
    });
  });

  test('client: public blog post detail (W2.8 demo-w2-published)', async ({
    clientPage,
  }) => {
    if (!demo.blogSlug)
      test.skip(true, 'No demo blog post — run pnpm demo:seed');
    await clientPage.goto(`/ar/blog/${demo.blogSlug}`);
    await clientPage.waitForLoadState('networkidle');
    await clientPage.screenshot({
      path: snapPath('client', 'blog-post-detail'),
      fullPage: true,
    });
    // Confirm share buttons rendered
    await expect(
      clientPage.locator('[data-component="share-buttons"]')
    ).toBeVisible();
  });

  // ── Supplier persona ──

  test('supplier: KPI dashboard (V6 — 6 cards + 4 recharts)', async ({
    supplierPage,
  }) => {
    await supplierPage.goto('/ar/supplier/dashboard');
    await supplierPage.waitForLoadState('networkidle');
    // Wait an extra beat for recharts SVGs to mount
    await supplierPage.waitForTimeout(600);
    await supplierPage.screenshot({
      path: snapPath('supplier', 'kpi-dashboard'),
      fullPage: true,
    });
    await expect(
      supplierPage.locator('[data-component="revenue-bar-chart"]').first()
    ).toBeVisible({ timeout: 8000 });
  });

  test('supplier: notifications mirror (W4.2)', async ({ supplierPage }) => {
    await supplierPage.goto('/ar/supplier/notifications');
    await supplierPage.waitForLoadState('networkidle');
    await supplierPage.screenshot({
      path: snapPath('supplier', 'notifications-mirror'),
      fullPage: true,
    });
  });

  // ── Admin persona ──

  test('admin: leads dashboard (V1.3 — 20 leads sorted hot→cold)', async ({
    adminPage,
  }) => {
    await adminPage.goto('/admin/leads');
    await adminPage.waitForLoadState('networkidle');
    await adminPage.screenshot({
      path: snapPath('admin', 'leads-dashboard'),
      fullPage: true,
    });
    // Confirm at least one hot lead chip
    await expect(adminPage.locator('[data-category="hot"]').first()).toBeVisible({
      timeout: 8000,
    });
  });

  test('admin: analytics page (V3 — funnel + DAU + categories)', async ({
    adminPage,
  }) => {
    await adminPage.goto('/admin/analytics');
    await adminPage.waitForLoadState('networkidle');
    await adminPage.screenshot({
      path: snapPath('admin', 'analytics-dashboard'),
      fullPage: true,
    });
  });

  test('admin: blog list (V5.2)', async ({ adminPage }) => {
    await adminPage.goto('/admin/blog');
    await adminPage.waitForLoadState('networkidle');
    await adminPage.screenshot({
      path: snapPath('admin', 'blog-list'),
      fullPage: true,
    });
  });

  test('admin: blog new post (V5.2 — Tiptap bilingual editor)', async ({
    adminPage,
  }) => {
    await adminPage.goto('/admin/blog/new');
    await adminPage.waitForLoadState('networkidle');
    // Tiptap mounts asynchronously
    await adminPage.waitForTimeout(500);
    await adminPage.screenshot({
      path: snapPath('admin', 'blog-new-editor'),
      fullPage: true,
    });
  });
});
