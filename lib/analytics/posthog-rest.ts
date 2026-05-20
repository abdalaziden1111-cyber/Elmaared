// Phase V3.2 — Thin typed wrapper around the PostHog Query API.
//
// Used by /admin/analytics to render funnels + KPI tiles server-side.
// All calls are no-ops when POSTHOG_API_KEY (the personal/project read
// key) isn't configured — the admin page falls back to "configure to
// enable" placeholders so the dashboard doesn't break.

const POSTHOG_HOST = (
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com'
).replace(/\/+$/, '');
const POSTHOG_PROJECT_ID = process.env.POSTHOG_PROJECT_ID;
const POSTHOG_API_KEY = process.env.POSTHOG_API_KEY;

export interface FunnelStep {
  eventName: string;
  label: string;
}

export interface FunnelResult {
  steps: Array<{ label: string; count: number; conversionPct: number | null }>;
  available: boolean;
  error?: string;
}

export interface DailyActiveCount {
  date: string;
  count: number;
}

interface PostHogQueryResult<T> {
  results: T;
}

async function callQuery<T>(query: unknown): Promise<T | null> {
  if (!POSTHOG_PROJECT_ID || !POSTHOG_API_KEY) return null;
  const url = `${POSTHOG_HOST}/api/projects/${POSTHOG_PROJECT_ID}/query/`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${POSTHOG_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
      // Admin dashboard tolerates a 5s timeout; longer would feel slow.
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) {
      console.error(
        `[posthog-rest] query failed ${res.status}: ${await res.text().catch(() => '')}`
      );
      return null;
    }
    const data = (await res.json()) as PostHogQueryResult<T>;
    return data.results ?? null;
  } catch (err) {
    console.error('[posthog-rest] query threw:', err);
    return null;
  }
}

/**
 * Run a funnel query across the provided steps. Each step matches one
 * event name. Result includes per-step count + cumulative conversion %.
 */
export async function fetchFunnel(
  steps: FunnelStep[],
  windowDays = 30
): Promise<FunnelResult> {
  if (!POSTHOG_PROJECT_ID || !POSTHOG_API_KEY) {
    return {
      available: false,
      steps: steps.map((s) => ({ label: s.label, count: 0, conversionPct: null })),
      error: 'PostHog credentials not configured',
    };
  }

  const series = steps
    .map((s) => `countIf(event = '${s.eventName}') AS ${s.eventName}_count`)
    .join(', ');
  const query = {
    kind: 'HogQLQuery',
    query: `SELECT ${series} FROM events WHERE timestamp >= now() - INTERVAL ${windowDays} DAY`,
  };

  const result = await callQuery<unknown[]>(query);
  if (!result || result.length === 0) {
    return {
      available: false,
      steps: steps.map((s) => ({ label: s.label, count: 0, conversionPct: null })),
      error: 'No data returned from PostHog',
    };
  }
  const row = result[0] as unknown[];
  const counts = steps.map((_, i) => Number(row[i] ?? 0));
  const firstCount = counts[0];
  return {
    available: true,
    steps: steps.map((s, i) => ({
      label: s.label,
      count: counts[i],
      conversionPct:
        firstCount > 0 ? Math.round((counts[i] / firstCount) * 1000) / 10 : null,
    })),
  };
}

export async function fetchDailyActiveUsers(
  windowDays = 30
): Promise<{ available: boolean; days: DailyActiveCount[]; error?: string }> {
  if (!POSTHOG_PROJECT_ID || !POSTHOG_API_KEY) {
    return {
      available: false,
      days: [],
      error: 'PostHog credentials not configured',
    };
  }
  const query = {
    kind: 'HogQLQuery',
    query: `
      SELECT toDate(timestamp) AS day, count(DISTINCT distinct_id) AS dau
      FROM events
      WHERE timestamp >= now() - INTERVAL ${windowDays} DAY
      GROUP BY day
      ORDER BY day ASC
    `,
  };
  const result = await callQuery<Array<[string, number]>>(query);
  if (!result) {
    return { available: false, days: [], error: 'No data returned' };
  }
  return {
    available: true,
    days: result.map((row) => ({ date: String(row[0]), count: Number(row[1]) })),
  };
}

export const POSTHOG_REST_CONFIGURED = Boolean(
  POSTHOG_PROJECT_ID && POSTHOG_API_KEY
);
