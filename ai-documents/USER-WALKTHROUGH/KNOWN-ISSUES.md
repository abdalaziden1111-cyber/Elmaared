# Known issues (cleared after P4 fix campaign)

Items that look like bugs but are out of our control, plus the actions we did
take when there was a meaningful mitigation.

## B-005 — Hydration warning from third-party Chrome extensions

**Status:** mitigated.

A handful of common Chrome extensions (YouTube Downloader, some Grammarly
configurations, etc.) inject DOM attributes (e.g. `data-yd-content-ready`) on
`<body>` before React hydrates. React then logs a hydration mismatch in dev,
and the Next.js dev-overlay surfaces a "1 Issue" pill (B-007).

**Fix:** added `suppressHydrationWarning` on `<html>` and `<body>` in
[`app/[locale]/layout.tsx`](app-exhibition-mvp/app/[locale]/layout.tsx). The
flag silences the warning only at those two elements — app-level hydration
bugs inside any child component still surface normally. This is the
[React-documented way](https://react.dev/reference/react-dom/client/hydrateRoot#suppressing-unavoidable-hydration-mismatch-errors)
to handle DOM that is intentionally different between server and client.

**Production effect:** none. Production users without these extensions don't
see the warning, and `pnpm build && pnpm start` doesn't render the dev
overlay regardless.

## B-006 — "Lushe" floating widget on marketing pages

**Status:** not in our code.

Audited the whole repo: no `Lushe` / `lushe` string in any `.ts`, `.tsx`,
`.css`, or `.html` file (the only grep hit was a false positive on the word
"flushes" in a comment). The widget is being injected by a browser extension
on the tester's machine — most likely a sales-prospecting tool. There is
nothing to remove from the app codebase.

**If the widget is unwanted on the tester's screenshots:** open
`chrome://extensions/`, disable the extension that surfaces "Lushe", reload.

## B-007 — Dev-overlay "1 Issue" badge

**Status:** resolved as a side effect of B-005.

The badge counted the hydration warning B-005. Suppressing that warning drops
the badge count to 0 in dev. The badge has never rendered in production.
