# Phase W1 — Phase V migrations applied

## Applied

- **2026-05-20 13:14:12.869221 UTC** — all 10 Phase V migrations applied
  via the Supabase Management API (`POST /v1/projects/apxuqcvhcfornjlowibj/database/query`)
  using `scripts/apply-phase-v-migrations.mjs`. HTTP 201.

Verification probe immediately after:

```
=== Z2 migration verification ===
URL: https://apxuqcvhcfornjlowibj.supabase.co

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
  ✅ enum:milestone_type:first_proposal_received
  ✅ enum:milestone_type:first_chat_opened
  ✅ enum:milestone_type:first_agreement_signed
  ✅ enum:milestone_type:first_escrow_funded
  ✅ enum:milestone_type:first_project_completed
  ✅ enum:milestone_type:500k_gmv
  ✅ enum:milestone_type:1m_gmv
  ✅ table:ai_usage_log
  ✅ table:ai_score_cache
  ✅ column:agreements.ai_risky_clauses
  ✅ table:lead_scores
  ✅ table:notification_preferences
  ✅ table:blog_posts
  ✅ bucket:blog-images

  ✅ Z2 tracker — 7 migration row(s) applied
  ✅ Phase V tracker — 10 migration row(s) applied
     • 20260520000005_milestones_expand.sql
     • 20260520000006_ai_usage_log.sql
     • 20260520000007_ai_score_cache.sql
     • 20260520000008_agreement_risky_clauses.sql
     • 20260520000009_lead_scores.sql
     • 20260520000010_notification_filters.sql
     • 20260520000011_notification_preferences.sql
     • 20260520000012_blog_posts.sql
     • 20260520000013_blog_images_bucket.sql
     • 20260520000014_supplier_kpi_indexes.sql

All checks passed — DB is up to date with Phase Z2 + Phase V.
```

## Issues hit + resolved

**First attempt: HTTP 400 on the `ai_usage_log` partial-index predicate.**
The original V1.1 migration declared:

```sql
CREATE INDEX idx_ai_usage_log_user_recent
  ON ai_usage_log (user_id, created_at DESC)
  WHERE created_at > (NOW() - INTERVAL '7 days');
```

Postgres rejects `NOW()` in an index predicate because predicates must be
IMMUTABLE and `NOW()` is VOLATILE. Fix: dropped the WHERE clause from
both the bundle (`ai-documents/W-apply-all.sql`) and the source migration
(`supabase/migrations/20260520000006_ai_usage_log.sql`). The full index
still hits the rate-limit lookup (always filters by `user_id +
created_at`). Re-applied; HTTP 201.

The mid-flight failure left only the tracker table + the `mig05`
ALTER TYPE statements applied (those run outside the DO-block guard).
The DO-block for mig06 rolled back. The retry skipped mig05 (tracker
guard) and proceeded cleanly through 06–14.

## Next steps

1. `pnpm db:types` — regenerate `lib/supabase/types.ts` from the new
   schema (Phase V columns + tables become typed).
2. `pnpm demo:reset --yes` — wipe + reseed with W2 Phase V data.
3. Run `tests/e2e/w6-activation.spec.ts` to capture 12 screenshots.
