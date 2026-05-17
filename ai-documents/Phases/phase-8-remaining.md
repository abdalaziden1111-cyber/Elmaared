# Phase 8 — Remaining Execution Plan

> **Companion to**: [phase-8-production-hardening.md](phase-8-production-hardening.md). That doc set the strategic direction; this one is the executable punch list for what's left.

> **State as of writing**: A done, B/D/E partial, C done, F/G/H not started.

---

## What's already done (recap)

| Sub-phase | Status | Notes |
|---|---|---|
| A — Foundation | ✅ done | Locale redirects, home CTAs, loading skeletons, dead-action cleanup |
| B — Scalable Lists | ⚠️ 4/9 done | Components built. Applied to `/admin/rfqs`, `/admin/chats`, `/dashboard/rfqs`, `/supplier/rfqs` |
| C — Mobile + A11y | ✅ done | Drawer in 3 layouts, focus-visible, aria-labels |
| D — Supplier Profile Edit | ⚠️ form done, file uploads pending | Bank change auto-flips status to pending_review |
| E — Admin Power Tools | ⚠️ details done, actions pending | RFQ detail + chat detail with "join" wired. Cancel/archive/resolve/release missing |
| F — Realtime + Notifications | ⏸️ | Not started |
| G — i18n Migration | ⏸️ | Not started |
| H — Quality Gates | ⏸️ | Not started |

---

## Execution order (priority-ranked)

Sequencing reasoning:

1. **B-rest first** — 1 day, same recipe 5×, finishes scalable-list rollout cleanly.
2. **E-rest second** — admin actions unlock real ops capability (cancel RFQ, refund, archive).
3. **D-uploads** — file uploads are the last gap in supplier self-service.
4. **F (realtime)** — turns admin dashboard into live-ops tool.
5. **H (quality gates)** — tests before i18n migration so regressions in i18n are caught.
6. **G (i18n) last** — biggest refactor; do it on a stable codebase.

Estimated total: **~17 working days** for 1 engineer + AI pairing.

---

## Round 1 — B-rest (apply pagination + filter to 5 lists)

**Effort**: 1 day. **Files**: 5 modified.

### Pages
| File | Filters needed |
|---|---|
| [app/[locale]/supplier/proposals/page.tsx](app/[locale]/supplier/proposals/page.tsx) | status filter (6 options) + page |
| [app/[locale]/supplier/projects/page.tsx](app/[locale]/supplier/projects/page.tsx) | status filter (6 options) + page |
| [app/[locale]/supplier/earnings/page.tsx](app/[locale]/supplier/earnings/page.tsx) | status filter on tx list + page (preserve summary cards) |
| [app/admin/disputes/page.tsx](app/admin/disputes/page.tsx) | resolved/unresolved toggle + page |
| [app/admin/suppliers/pending/page.tsx](app/admin/suppliers/pending/page.tsx) | search by company name + page |

### Recipe per page (copy from [/admin/rfqs/page.tsx](app/admin/rfqs/page.tsx))
1. Accept `searchParams: Promise<{ page?, q?, status? }>`.
2. Parse + clamp page.
3. Two queries: count (head: true) + range slice.
4. Render `<SearchBar/>` and/or `<StatusFilter/>` row.
5. Render `<Pagination/>` after list.
6. Empty state distinguishes "no data" vs "no matches".

### Acceptance
- Loading `/ar/supplier/proposals?status=rejected&page=2` returns paged slice of rejected proposals.
- 0-results-with-filter shows clear-filter hint.
- Total count shown in pagination footer.

---

## Round 2 — E-rest (admin operational actions)

**Effort**: 3 days. **Files**: 5 new server actions + 4 new UI components + 1 new page.

### Server actions to add

**File**: [app/actions/admin.ts](app/actions/admin.ts) (extend existing).

1. **`cancelRfqAction(rfqId, reason)`**
   - Validate: rfq exists, status not in `{completed, cancelled}`.
   - If escrow exists with status ∈ `{deposit_received, work_in_progress}`: set escrow.status = `refunded`, set rfq.status = `cancelled`, write audit. Notify both parties.
   - Zod: `reason` required, min 10 chars.
   - revalidate `/admin/rfqs`, `/admin/rfqs/[id]`, client & supplier views.

2. **`archiveChatAction(chatId)`**
   - Set chat.is_archived = true.
   - Audit.
   - revalidate `/admin/chats`, `/admin/chats/[id]`.

3. **`resolveDisputeAction(chatId, resolutionNotes, outcome)`**
   - `outcome ∈ {'released_to_supplier', 'refunded_to_client', 'split'}` — for now just records the decision; doesn't auto-trigger payment.
   - Sets chat.panic_at = null (resolves), inserts admin message with resolution.
   - Audit log entry of `dispute_resolved`.
   - revalidate `/admin/disputes`, `/admin/chats/[id]`.

4. **`overrideRfqStatusAction(rfqId, newStatus, reason)`**
   - Last-resort recovery action; admin-only.
   - Zod: `newStatus` ∈ all valid RfqStatus values, `reason` min 20 chars.
   - Direct UPDATE on rfqs.status. Audit with `metadata.previous_status`.
   - revalidate.

### UI to add

**File**: [app/admin/rfqs/[id]/admin-actions.tsx](app/admin/rfqs/[id]/admin-actions.tsx) (new — client component).
- Renders a collapsible "إجراءات Admin" panel at bottom of RFQ detail.
- Three buttons: "إلغاء الطلب", "نقل لحالة أخرى", each opens a confirm modal with reason textarea.
- Same inline-error pattern as other action buttons.

**File**: [app/admin/chats/[id]/admin-actions.tsx](app/admin/chats/[id]/admin-actions.tsx) (new).
- Buttons: "أرشف المحادثة" + (if panic) "احل النزاع".
- Resolve dispute opens modal with `outcome` radio + notes textarea.

**File**: [app/admin/escrow/pending-releases/page.tsx](app/admin/escrow/pending-releases/page.tsx) (new).
- Lists `escrow_transactions` where status = `delivered` and client_approved.
- Each row: total, supplier_net, RFQ link.
- "Release to supplier" button — opens form for `releaseTransactionRef` (bank wire ref) → calls existing `adminReleaseToSupplierAction`.
- Add to admin sidebar: `<Link href="/admin/escrow/pending-releases">` between deposits and disputes.

### Tests
Add to [tests/integration/actions/admin.test.ts](tests/integration/actions/admin.test.ts):
- cancelRfqAction success path
- cancelRfqAction blocked when status=completed
- resolveDisputeAction marks panic_at=null
- overrideRfqStatusAction writes audit with previous_status

### Acceptance
- Admin can cancel an open RFQ from `/admin/rfqs/[id]` and see status change.
- Admin can archive a chat from `/admin/chats/[id]`.
- Admin can resolve a panic-flagged chat with notes; disputes page count decrements.
- Admin can release escrow to supplier from new page; existing `/admin/escrow/pending-deposits` still works.
- All 4 dead server actions (raisePanic, adminJoinChat, submitDelivery, adminReleaseToSupplier) are now wired to UI.

---

## Round 3 — D-uploads (supplier file uploads)

**Effort**: 2 days. **Files**: 1 server action + 3 form fields.

### Scope
- Supplier can replace `cr_document_url`, `vat_document_url`, `portfolio_pdf_url` from the edit page.
- Files go to Supabase Storage bucket `supplier-docs` (private; signed URLs).
- Max 10 MB per file, types PDF/JPG/PNG only.
- Each upload: audit + revalidate.

### Steps

**Migration**: ensure Storage bucket exists.
```sql
-- supabase/migrations/<timestamp>_supplier_docs_bucket.sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('supplier-docs', 'supplier-docs', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Suppliers can upload their own docs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'supplier-docs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Suppliers can read their own docs"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'supplier-docs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Admins can read all docs"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'supplier-docs'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
```

**Server action** [app/actions/supplier-uploads.ts](app/actions/supplier-uploads.ts):
- `uploadSupplierDocAction(field: 'cr'|'vat'|'portfolio', file: File)`
- Validates type + size, generates path `${user.id}/${field}-${ts}.${ext}`, uploads, updates supplier row column.
- Audit `supplier_doc_uploaded`.

**UI**: extend [edit-profile-form.tsx](app/[locale]/supplier/profile/edit/edit-profile-form.tsx) with a "المستندات" section. Three drag-drop areas with current-file preview link.

### Acceptance
- Supplier uploads new CR doc → file appears in private storage, link updates, audit recorded.
- Admin can view it on `/admin/suppliers/pending/[id]` (also build that detail page in this round).
- Size > 10MB rejected client-side and server-side.

---

## Round 4 — F (Realtime + Notifications UI)

**Effort**: 3 days. **Files**: 1 hook + 1 bell component + 3 layout updates + realtime subscriptions in 2 pages.

### Hook

**File**: [components/realtime/use-realtime-channel.ts](components/realtime/use-realtime-channel.ts) (new):
```ts
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

export function useRealtimeRefresh(args: {
  table: string;
  filter?: string; // postgres-changes filter, e.g. 'panic_at=not.is.null'
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
}) {
  const router = useRouter();
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const channel = supabase
      .channel(`${args.table}-changes`)
      .on(
        'postgres_changes',
        { event: args.event ?? '*', schema: 'public', table: args.table, filter: args.filter },
        () => router.refresh()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [args.table, args.filter, args.event, router]);
  return null;
}
```

### Apply
- [/admin/disputes/page.tsx](app/admin/disputes/page.tsx) — add `<RealtimeDisputesRefresh/>` client component that subscribes to chats UPDATEs where panic_at IS NOT NULL.
- [/admin/chats/[id]/page.tsx](app/admin/chats/[id]/page.tsx) — subscribe to messages INSERTs where chat_id={id}. Refresh on each new message.
- [components/chat/chat-window.tsx](components/chat/chat-window.tsx) — audit and confirm it already does this (it probably uses a different subscription pattern).

### Notification bell

**File**: [components/header/notification-bell.tsx](components/header/notification-bell.tsx) (new — client component):
- Reads `notifications` count for current user where `read_at IS NULL`.
- Renders bell icon with badge.
- On click → dropdown showing last 10 notifications (server action returns them).
- "Mark all as read" button → calls `markNotificationsReadAction`.
- Realtime-subscribed to own notifications.

**Server action** to add to [app/actions/notifications.ts](app/actions/notifications.ts):
- `markNotificationsReadAction(ids?: string[])` — marks specific ids or all unread as read.
- `getRecentNotificationsAction(limit = 10)` — for the dropdown.

### Layout integration
- Each of 3 layouts: add a small top-bar on desktop alongside (or above) the existing aside, with the bell on the right. Mobile already has a top bar — add bell there too.

### Acceptance
- Tab A: open `/admin/disputes`. Tab B: in DB raise a panic (or via the chat). Tab A list updates within 1s without F5.
- Open chat detail. New message arrives → page refreshes silently.
- Bell shows correct unread count, dropdown shows 10 latest, mark-all-read clears badge.

---

## Round 5 — H (Quality gates: E2E, Sentry, Health)

**Effort**: 5 days. **Files**: ~6 new spec files + Sentry init + health route + CI workflow.

### Playwright fixtures

**File**: [tests/e2e/fixtures/auth.ts](tests/e2e/fixtures/auth.ts) (new):
- Custom Playwright fixtures that create test users on first use, sign them in via Supabase, save storage state per role to `tests/e2e/.auth/<role>.json`.
- Roles: `clientUser`, `supplierUserApproved`, `supplierUserPending`, `adminUser`.

**File**: [tests/e2e/fixtures/db-reset.ts](tests/e2e/fixtures/db-reset.ts) (new):
- `resetTestDb()` — truncates RFQs, proposals, chats, messages, agreements, escrow for test users. Idempotent.
- Run as global setup.

### E2E specs

**File 1**: [tests/e2e/journeys/client-full-flow.spec.ts](tests/e2e/journeys/client-full-flow.spec.ts)
- signup → publish RFQ → wait for fixture-seeded proposal → shortlist → award → submit understanding → sign agreement → upload escrow receipt → wait for admin confirm → approve delivery.

**File 2**: [tests/e2e/journeys/supplier-full-flow.spec.ts](tests/e2e/journeys/supplier-full-flow.spec.ts)
- signup → admin approves → matching RFQ appears → submit proposal → get shortlisted → chat → sign agreement → mark delivered.

**File 3**: [tests/e2e/journeys/admin-full-flow.spec.ts](tests/e2e/journeys/admin-full-flow.spec.ts)
- Review pending supplier → approve → confirm deposit → release to supplier.

**File 4**: [tests/e2e/journeys/panic-flow.spec.ts](tests/e2e/journeys/panic-flow.spec.ts)
- Client raises panic → admin sees in `/admin/disputes` → admin joins chat → resolves.

**File 5**: [tests/e2e/journeys/profile-edit.spec.ts](tests/e2e/journeys/profile-edit.spec.ts)
- Supplier updates IBAN → status drops to pending → admin sees in pending list → re-approves.

**Update**: [tests/e2e/route-smoke.spec.ts](tests/e2e/route-smoke.spec.ts) — add the 7 new public/protected paths.

### Sentry

```bash
pnpm add @sentry/nextjs
pnpm dlx @sentry/wizard@latest -i nextjs
```

Configure:
- `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`.
- Capture server-action errors via a wrapper.
- Source maps uploaded in CI.
- Env var `NEXT_PUBLIC_SENTRY_DSN` documented in [.env.example](.env.example).

### Health endpoint

**File**: [app/api/health/route.ts](app/api/health/route.ts) (new):
```ts
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

export async function GET() {
  const admin = createAdminClient();
  const start = Date.now();
  const { error } = await admin.from('profiles').select('id', { head: true, count: 'exact' }).limit(1);
  const dbMs = Date.now() - start;
  if (error) {
    return NextResponse.json({ status: 'degraded', db: 'error', dbMs }, { status: 503 });
  }
  return NextResponse.json({
    status: 'ok',
    db: 'ok',
    dbMs,
    commit: process.env.VERCEL_GIT_COMMIT_SHA ?? 'local',
    timestamp: new Date().toISOString(),
  });
}
```

### CI

**File**: [.github/workflows/pr.yml](.github/workflows/pr.yml) (new):
```yaml
name: PR
on: [pull_request]
jobs:
  lint-typecheck-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm exec tsc --noEmit
      - run: pnpm exec vitest run
  e2e:
    runs-on: ubuntu-latest
    needs: lint-typecheck-test
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install chromium
      - run: pnpm exec playwright test
        env:
          E2E_BASE_URL: ${{ secrets.E2E_BASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

### Lighthouse
- Run manually on staging: `pnpm dlx lighthouse https://staging.app/ar/dashboard/rfqs --output=json --output-path=test-results/lh-dashboard.json`.
- Target ≥ 90 performance, ≥ 95 accessibility.
- Fix biggest LCP/CLS offenders if scores below.

### Acceptance
- 5 E2E specs pass locally and in CI.
- Health endpoint returns 200 with expected shape.
- Sentry receives a test event from a deployed preview.
- Lighthouse JSON committed per release.

---

## Round 6 — G (i18n migration)

**Effort**: 5 days. **Highest churn**: ~40 files touched, ~200+ strings extracted.

### Strategy: progressive, not big-bang

Do it in 3 sub-rounds:

#### G.1 — Migrate Link/router imports (1 day)
- Replace `import Link from 'next/link'` → `import { Link } from '@/lib/i18n/routing'` everywhere.
- Replace `useRouter`, `usePathname`, `redirect` similarly.
- Run `grep -rln "from 'next/link'" app components` and walk the list.
- After this, all client-side navigation is locale-aware. Sub-phase A's server-side redirect fix completes the picture.

#### G.2 — Extract strings to JSON (3 days)
Per-area approach:
- Day 1: auth flows + marketing pages.
- Day 2: dashboard pages (client side).
- Day 3: supplier + admin pages.

For each page:
1. Add `import { useTranslations } from 'next-intl';` (or `getTranslations` for server components).
2. Replace inline strings with `t('namespace.key')`.
3. Add corresponding keys to [lib/i18n/messages/ar.json](lib/i18n/messages/ar.json) and `en.json`.

Status label maps (`STATUS_LABEL`, `SERVICE_LABEL`) move to [lib/i18n/labels.ts](lib/i18n/labels.ts) — a function that takes locale + status and returns the right label.

#### G.3 — English translation pass (1 day)
- Have a human translator review [en.json](lib/i18n/messages/en.json).
- Verify RTL/LTR transitions in admin (currently dir="rtl" hardcoded — needs locale-driven).
- Verify number/date formatters use `Intl` with locale.
- Test `/en/dashboard/rfqs` end-to-end.

### Acceptance
- `grep -r "from 'next/link'" app components | wc -l` = 0.
- `/en/*` renders English throughout.
- Switching locale on any deep page preserves the path.
- All status badges, button labels, empty states translated.

---

## Cross-cutting checklist (every round)

For each round before declaring done:
- [ ] `pnpm exec tsc --noEmit` clean
- [ ] `pnpm exec vitest run` all pass
- [ ] HTTP probes show new routes resolve correctly
- [ ] No new `console.log`/`console.error` left in code
- [ ] No new `alert()` calls (inline error pattern)
- [ ] No new `next/link` imports if past Round 6 G.1
- [ ] Server actions all call `recordAudit`
- [ ] New DB queries verified against existing indexes; add migration if needed

---

## Definition of "Phase 8 complete"

The 9-point production-ready checklist from [phase-8-production-hardening.md](phase-8-production-hardening.md) all green:

1. Authenticates correctly in 1 hop — ✅ done in A
2. Sees data with pagination + search + filter — partial → full after Round 1
3. Updates own data through forms — done in D → full after Round 3 (uploads)
4. Sees sensible error pages — ✅ done in earlier rounds
5. Works on phone — ✅ done in C
6. Sees notifications in real-time — Round 4
7. Reads in own language — Round 6
8. Audit-logged actions — partial → full after Round 2 (admin actions)
9. System monitored — Round 5

---

## Suggested calendar

| Calendar Day | Round | Output |
|---|---|---|
| Day 1 | Round 1 (B-rest) | 5 list pages paginated |
| Days 2-4 | Round 2 (E-rest) | All admin actions wired |
| Days 5-6 | Round 3 (D-uploads) | File uploads working |
| Days 7-9 | Round 4 (F) | Realtime + bell |
| Days 10-14 | Round 5 (H) | E2E suite + Sentry + CI |
| Days 15-17 | Round 6 (G) | i18n full migration |

Total: **~17 working days** (≈3.5 calendar weeks at 5 days/week).

---

## What to start with tomorrow

**Round 1 (B-rest)** — same recipe, 5 files. Half a day, mechanical, zero risk.

Order within the round:
1. `/admin/suppliers/pending` (admin-facing, simplest — search only).
2. `/supplier/proposals` (status filter).
3. `/supplier/projects` (status filter).
4. `/admin/disputes` (resolved toggle).
5. `/supplier/earnings` (status filter on transactions list, preserve summary cards).

Each is ~30 lines diff. After lunch you should be in Round 2.
