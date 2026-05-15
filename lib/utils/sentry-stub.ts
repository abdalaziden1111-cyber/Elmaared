// No-op stub aliased in for `@sentry/nextjs` when Sentry isn't installed.
// The instrumentation files do `import('@sentry/nextjs').catch(() => null)`
// and then `if (!sentryAny) return;` — by returning a non-object here we
// would break that null-check. Instead, we export an `init` no-op and skip
// instrumentation by leaving DSN unset (the calling code already gates on
// `process.env.NEXT_PUBLIC_SENTRY_DSN`).

export function init() {
  // intentionally empty
}

export default { init };
