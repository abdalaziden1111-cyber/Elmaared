# Phase Z2 DB apply log

Tracks transport choice and apply status for the 7 pending migrations
across the live Supabase DB.

## Status (2026-05-19, before paste)

**Transport selected:** Studio paste — `db.apxuqcvhcfornjlowibj.supabase.co`
is IPv6-only and unreachable from the development host (same blocker the
three audits hit). The user dismissed the alternative-transport question,
so we defaulted to the lowest-credential-friction path.

**Pre-paste verification** (`node scripts/verify-pending-migrations.mjs`):

```
❌ column:proposals.ai_confidence           status=400  (does not exist)
❌ column:proposals.ai_sample_size          status=400
❌ column:proposals.ai_variance_pct         status=400
❌ column:proposals.ai_price_range_min      status=400
❌ column:proposals.ai_price_range_max      status=400
❌ table:ai_feedback                        status=404
❌ table:supplier_trust_signals             status=404
❌ table:user_milestones                    status=404
❌ column:profiles.preferred_calendar       status=400
❌ column:profiles.preferred_numerals       status=400
❌ column:suppliers.is_concierge_managed    status=400
❌ tracker (public._z2_migrations_applied)  not present
```

12/12 missing — expected. Nothing has been applied yet.

## How to apply

1. Open the Supabase dashboard for project `apxuqcvhcfornjlowibj`.
2. Go to **SQL Editor** → **New query**.
3. Open [Z2-apply-all.sql](Z2-apply-all.sql) locally and copy its full
   contents into the editor (~330 lines).
4. Click **Run**. The bundle wraps every migration in a DO-block guard,
   so re-runs are safe — already-applied migrations are skipped via the
   `public._z2_migrations_applied` tracker.
5. The final `SELECT` shows which migrations the tracker now contains.
   Expect 7 rows.

## Post-paste verification

From the laptop:

```bash
pnpm exec node scripts/verify-pending-migrations.mjs
```

All 12 check lines + the tracker line should turn `✅`. Sample expected
output:

```
✅ column:proposals.ai_confidence
✅ column:proposals.ai_sample_size
✅ column:proposals.ai_variance_pct
✅ column:proposals.ai_price_range_min
✅ column:proposals.ai_price_range_max
✅ table:ai_feedback
✅ table:supplier_trust_signals
✅ table:user_milestones
✅ column:profiles.preferred_calendar
✅ column:profiles.preferred_numerals
✅ column:suppliers.is_concierge_managed
✅ tracker — 7 migration row(s) applied
   • 20261119000001_ai_confidence_metadata.sql  …
   • 20261119000002_ai_feedback.sql              …
   • 20261119000003_supplier_trust_signals.sql   …
   • 20261119000004_user_milestones.sql          …
   • 20261119000005_cultural_preferences.sql     …
   • 20261119000006_supplier_concierge_managed.sql  …
   • 20261201000001_rls_recursion_fix.sql        …
All checks passed — DB is up to date with Phase Z2.
```

Then also run the recursion probe to confirm Item 1 actually broke the
42P17 cycle:

```bash
pnpm exec node scripts/probe-rfq-rls.mjs
```

Expect rows from `rfqs` and `proposals` queries — no
`infinite recursion detected in policy` errors.

## What this closes

Audit-tracker items **P1-1** (recursive RLS) and the implicit
"Sprint 1/3/4/5 migrations not on prod" follow-up flagged across
three audits.

## Apply-log entries

Append a line under "Applied" after each paste, so future readers know
when the DB caught up.

### Applied

- _pending — user paste required_
