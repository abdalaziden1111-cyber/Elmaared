// Phase V3.1 — Reverse proxy for PostHog ingestion.
//
// Browser posthog-js is configured to call /api/posthog/* so ad-blockers
// that filter app.posthog.com don't drop our analytics. We forward to the
// configured PostHog host (default app.posthog.com) preserving method,
// path, query string, and body.
//
// Safety: only proxy to the explicit PostHog host configured via env —
// never to a user-controlled URL.

import { NextResponse, type NextRequest } from 'next/server';

const POSTHOG_HOST = (
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com'
).replace(/\/+$/, '');

async function proxy(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
): Promise<Response> {
  const { path } = await params;
  const segments = Array.isArray(path) ? path.join('/') : '';
  const target = `${POSTHOG_HOST}/${segments}${request.nextUrl.search}`;

  // Forward only the headers PostHog actually needs. Drop host/origin so
  // PostHog sees its own host header.
  const headers = new Headers();
  for (const [k, v] of request.headers.entries()) {
    const lower = k.toLowerCase();
    if (
      lower === 'host' ||
      lower === 'origin' ||
      lower === 'referer' ||
      lower === 'cookie'
    ) {
      continue;
    }
    headers.set(k, v);
  }

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: 'manual',
  };
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.arrayBuffer();
  }

  try {
    const upstream = await fetch(target, init);
    const responseHeaders = new Headers();
    for (const [k, v] of upstream.headers.entries()) {
      const lower = k.toLowerCase();
      if (lower === 'set-cookie' || lower === 'content-encoding') continue;
      responseHeaders.set(k, v);
    }
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    console.error('[posthog-proxy] upstream failed:', err);
    return NextResponse.json(
      { error: 'posthog upstream unreachable' },
      { status: 502 }
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const OPTIONS = proxy;
