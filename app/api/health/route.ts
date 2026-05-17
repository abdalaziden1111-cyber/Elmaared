// Liveness + DB connectivity probe. Used by Vercel uptime checks and the
// status page. Returns 200 when the DB responds in under 3s, 503 otherwise.
// Cheap query — just counts profiles head-only. Never blocks the request
// thread for more than the timeout.

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DB_TIMEOUT_MS = 3000;

interface HealthPayload {
  status: 'ok' | 'degraded';
  db: 'ok' | 'timeout' | 'error';
  dbMs: number;
  commit: string;
  timestamp: string;
}

async function pingDb(): Promise<{ ok: boolean; ms: number; reason: 'ok' | 'timeout' | 'error' }> {
  const start = Date.now();
  const admin = createAdminClient();

  try {
    const result = await Promise.race([
      admin.from('profiles').select('id', { head: true, count: 'exact' }).limit(1),
      new Promise<{ error: { message: string } }>((_, reject) =>
        setTimeout(
          () => reject(Object.assign(new Error('timeout'), { __timeout: true })),
          DB_TIMEOUT_MS
        )
      ),
    ]);
    const ms = Date.now() - start;
    if ('error' in result && result.error) {
      return { ok: false, ms, reason: 'error' };
    }
    return { ok: true, ms, reason: 'ok' };
  } catch (err) {
    const ms = Date.now() - start;
    const isTimeout = (err as { __timeout?: boolean } | null)?.__timeout === true;
    return { ok: false, ms, reason: isTimeout ? 'timeout' : 'error' };
  }
}

export async function GET() {
  const db = await pingDb();
  const payload: HealthPayload = {
    status: db.ok ? 'ok' : 'degraded',
    db: db.reason,
    dbMs: db.ms,
    commit: process.env.VERCEL_GIT_COMMIT_SHA ?? 'local',
    timestamp: new Date().toISOString(),
  };
  return NextResponse.json(payload, {
    status: db.ok ? 200 : 503,
    headers: { 'cache-control': 'no-store' },
  });
}
