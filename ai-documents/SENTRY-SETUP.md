# Sentry production setup — checklist

`@sentry/nextjs` is installed and wired (Phase Z2 Item 4). The integration
is **DSN-gated**: it only activates when `SENTRY_DSN` (server) or
`NEXT_PUBLIC_SENTRY_DSN` (client) is set. Local dev runs with neither and
is unaffected.

This document is what you do at sentry.io + Vercel to flip the integration
on for production.

## Steps

### 1. Create a Sentry project

- Go to <https://sentry.io/signup/> (or sign in if you already have an account).
- Create an organization if needed.
- Click **Create Project** → platform **Next.js**.
- Name it `app-exhibition-prod` (or however you label your prod env).
- Sentry will show a **DSN** that looks like:

  ```
  https://abc123def456@o1234567.ingest.sentry.io/7654321
  ```

  Copy it. The same DSN works for server and client; the env-var split is
  ours.

### 2. Set the DSN in Vercel env

Two variables (same value) — one for the server hook, one for the
browser hook:

| Env var                    | Value           | Environments       |
| -------------------------- | --------------- | ------------------ |
| `SENTRY_DSN`               | `<your DSN>`    | Production, Preview |
| `NEXT_PUBLIC_SENTRY_DSN`   | `<your DSN>`    | Production, Preview |

(Skip **Development** unless you want dev errors to land in Sentry too.)

In Vercel → project → Settings → Environment Variables → Add. Make sure
the `NEXT_PUBLIC_` one is marked as such (Vercel exposes it to the browser
bundle automatically based on prefix).

### 3. Redeploy

Trigger a deploy so the new env vars are baked in. `Next.js`'s
`register()` hook in [instrumentation.ts](../instrumentation.ts) runs once
per server runtime on boot and conditionally `Sentry.init()`s when it
sees `SENTRY_DSN`. Same logic on the client side in
[instrumentation-client.ts](../instrumentation-client.ts).

### 4. Confirm with a test event

Easiest: log in to the production site, deliberately hit a known
500-route (or trigger any `log.error(...)` path), then check
**sentry.io → Issues** for the event. The structured logger forwards
error events with the original Error attached, plus a `tags.event` and
the request context as `extra.*` fields.

If you don't have a deterministic error path handy, paste this into a
short-lived server action and call it:

```ts
import { log } from '@/lib/utils/logger';
log.error('manual_sentry_smoke', new Error('hello from prod'), { who: 'rakan' });
```

Within 30s the event should appear in Sentry, tagged
`event:manual_sentry_smoke`.

## Sampling defaults

- **Server traces:** 10% in production, 0% otherwise.
- **Client traces:** 5% in production, 0% otherwise. (Most user sessions
  are uninteresting — error-only is the right default.)
- **Replays:** 100% **on-error** sessions (only kicks in when
  `@sentry/replay` is added — it's not bundled yet); 0% baseline.

If volumes get too noisy after launch, tune the `tracesSampleRate` values
in `instrumentation.ts` + `instrumentation-client.ts`.

## What's deferred

- **Source-map upload** (`@sentry/cli`). Currently disabled in
  `pnpm-workspace.yaml`'s `allowBuilds` so the CLI binary isn't
  downloaded. Errors will still appear in Sentry, but the stack frames
  will reference minified bundle paths. To enable: flip
  `'@sentry/cli': false` to `true`, then add a `sentry.client.config.ts`
  + `sentry.server.config.ts` + a `withSentryConfig` wrapper in
  `next.config.ts`. Worth doing after the first prod incident makes
  unmapped stacks painful.
- **`@sentry/replay`** — session replay. Adds ~50 KB to the client
  bundle. Defer until product-side asks for it.

## What this closes

Audit-tracker item **P1-5** (Sentry DSN wired).

The integration is **deployed and dormant** today. Step 2 above is the
single flip needed to make it live.
