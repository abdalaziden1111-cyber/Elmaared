# Phase W5 — Trigger wiring verification

Pure verification pass. No new code expected — every trigger here was
wired in Phase V (V2.1 milestones, V4.2 dispatcher, V1.3 lead scoring,
V1.2 risky-clauses). W5's job is to confirm the wiring actually fires
end-to-end after migrations + seed land.

## Pre-requisites

1. W1 — Phase V migrations applied (pending `SUPABASE_MANAGEMENT_TOKEN`).
2. W2 — `pnpm demo:seed` run (the seed targets the W1 tables).
3. Dev server running on `http://localhost:3000`.
4. Logged in as `ahmed.client.test@example.com` / `TestClient2026!`
   for the client-side walks.

## W5.1 — Milestones auto-fire

**Wired in V2.1** via `safeAfter('milestone_*', () => maybeFireMilestone(...))`
inside `app/actions/{rfq,proposal,chat,agreement,escrow}.ts`.

### Test

1. As Ahmed, create a new RFQ (`/ar/dashboard/rfqs/new`) — submit.
2. Reload `/ar/dashboard`.
3. **Expected:** the `CelebrationModal` does NOT fire for `first_rfq`
   (already claimed by W2.1 seed, so idempotency wins).
4. The seed left `500k_gmv` unclaimed → modal SHOULD fire on first
   dashboard visit. After dismissing, reload — no second fire.

### Result

⏸ Pending live walk (will fill on first execution).

## W5.2 — Notifications auto-fire

**Wired in V4.2** via `dispatchNotification()` in every action that
previously called `notifications.insert()` directly. Honors per-user
prefs from `notification_preferences`.

### Test

1. Open `/ar/dashboard/notifications` as Ahmed in one browser window.
2. In a second window, log in as `m.supplier.test`, navigate to
   `/ar/supplier/rfqs`, click into Ahmed's `RFQ-DEMO-OPEN-*`, and
   submit a fresh proposal.
3. **Expected (Ahmed's window):**
   - New "عرض جديد على طلبك" row appears at the top within ~1 second
     (Supabase Realtime postgres_changes channel).
   - Ping plays once (sound enabled by default).
   - Unread badge in the header bell increments.

### Result

⏸ Pending live walk.

## W5.3 — Lead scoring batch

**Wired in V1.3** via `scripts/score-leads-nightly.mjs` + admin recompute
action `recomputeLeadAction()` in `app/admin/leads/actions.ts`.

### Test

1. `pnpm score:leads` — runs the deterministic rubric over every
   non-admin profile.
2. Visit `/admin/leads` as Sara.
3. **Expected:**
   - All 20 W2.5-seeded lead rows present (3 hot / 8 warm / 9 cold).
   - The one cold→hot transition row triggers an email to Sara (mock
     Resend output in dev console).
   - Click "إعادة احتساب" on any row → score + narrative refresh
     (narrative comes from real Anthropic only if
     `NEXT_PUBLIC_FF_AI_REAL=true` + key configured; otherwise the
     row keeps its `[mock]` seeded narrative).

### Result

⏸ Pending live walk.

## W5.4 — Risky-clauses detection on fresh agreement

**Wired in V1.2** via `analyzeAgreement()` in `lib/ai/analyze-agreement.ts`.
Called from `app/actions/agreement.ts:submitUnderstandingAction` once
both client + supplier have submitted ≥100-char understandings.

### Test (with `NEXT_PUBLIC_FF_AI_REAL=false`, the W6 default)

1. As Ahmed, navigate to a fresh demo agreement (not the W2.4 pre-seeded
   one). Submit a 100+ character "understanding".
2. As the matched supplier, submit a 100+ char understanding back.
3. **Expected:** `analyzeAgreement()` runs in `safeAfter` background.
   With `AI_REAL=false`, it writes `ai_recommendation =
   '[mock — عيّن NEXT_PUBLIC_FF_AI_REAL=true لتفعيل تحليل قانوني حقيقي]'`
   and leaves `ai_risky_clauses` as an empty array (the seeded W2.4
   row is the only one that exists with mock clauses pre-filled).
4. To see real clauses populated, flip `NEXT_PUBLIC_FF_AI_REAL=true`
   + add `AI_GATEWAY_API_KEY`, restart `pnpm dev`, re-run the flow.

### Result

⏸ Pending live walk. Seed-side verification: the W2.4 demo agreement
already has 3 risky clauses; visit `/ar/dashboard/rfqs/<demo-esc-rfq>/agreement`
to see the panel render immediately.

## Summary

All four triggers are wired in code (verified by Phase V tests). W5 is
a one-pass walk after W1+W2 land to confirm the wiring + the seed make
the surfaces self-activate. No production-blocking risks identified
during the code review phase.
