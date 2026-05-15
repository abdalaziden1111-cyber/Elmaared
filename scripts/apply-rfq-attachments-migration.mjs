// Bootstrap for the rfq-attachments Storage bucket.
//
// Tries two strategies in order:
//   1. Connect to SUPABASE_DB_URL via `pg` and run the full migration SQL
//      (bucket + RLS policies). Preferred — this is what the Supabase CLI
//      would do.
//   2. If the direct DB is unreachable (e.g. IPv6-only host with no v6
//      connectivity locally), fall back to creating the bucket via the
//      Storage REST API using the service-role key. RLS policies in
//      supabase/migrations/20260901000001_rfq_attachments_bucket.sql
//      remain to be applied by whoever has DB access; the server-side
//      upload action uses service-role and bypasses RLS, so end-to-end
//      file upload still works.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env.local');
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const eq = l.indexOf('=');
      return [l.slice(0, eq).trim(), l.slice(eq + 1).trim().replace(/^"|"$/g, '')];
    })
);

const sqlPath = resolve(
  __dirname,
  '..',
  'supabase',
  'migrations',
  '20260901000001_rfq_attachments_bucket.sql'
);
const sql = readFileSync(sqlPath, 'utf8');

async function tryDirectDb() {
  const url = env.SUPABASE_DB_URL;
  if (!url) throw new Error('SUPABASE_DB_URL missing');
  const client = new pg.Client({
    connectionString: url,
    connectionTimeoutMillis: 8000,
  });
  await client.connect();
  await client.query(sql);
  const { rows: buckets } = await client.query(
    "SELECT id, name, public FROM storage.buckets WHERE id = 'rfq-attachments'"
  );
  const { rows: policies } = await client.query(
    `SELECT polname FROM pg_policy
     WHERE polrelid = 'storage.objects'::regclass
     AND polname LIKE 'rfq_attachments_%'
     ORDER BY polname`
  );
  await client.end();
  return { mode: 'direct-db', buckets, policies };
}

async function fallbackStorageApi() {
  const projectUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!projectUrl || !serviceKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing');
  }
  // Create bucket (idempotent: 409 if exists)
  const res = await fetch(`${projectUrl}/storage/v1/bucket`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id: 'rfq-attachments',
      name: 'rfq-attachments',
      public: false,
      file_size_limit: 10 * 1024 * 1024,
      allowed_mime_types: [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp',
      ],
    }),
  });
  const body = await res.text();
  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    parsed = body;
  }
  if (!res.ok && res.status !== 409 && !/already exists/i.test(body)) {
    throw new Error(`Storage API error ${res.status}: ${body}`);
  }
  // Verify
  const listRes = await fetch(`${projectUrl}/storage/v1/bucket/rfq-attachments`, {
    headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey },
  });
  const bucket = await listRes.json();
  return {
    mode: 'storage-api',
    createResponse: { status: res.status, body: parsed },
    bucket,
    note: 'RLS policies were NOT applied (no DB access). The supabase/migrations/ file is committed and must be applied via Supabase CLI / dashboard. The server action uses service_role and bypasses RLS, so upload/download still functions.',
  };
}

(async () => {
  console.log('Attempting direct-DB migration first…');
  try {
    const result = await tryDirectDb();
    console.log(JSON.stringify(result, null, 2));
    return;
  } catch (err) {
    console.warn('Direct DB unreachable:', err.message);
    console.log('Falling back to Storage REST API for bucket creation…');
  }
  try {
    const result = await fallbackStorageApi();
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Fallback failed:', err.message);
    process.exit(1);
  }
})();
