#!/usr/bin/env node
// Phase W1 — Apply Phase V migrations via the Supabase Management API.
//
// Reads ai-documents/W-apply-all.sql and POSTs the whole bundle to
// `/v1/projects/{ref}/database/query` with a personal access token. The
// bundle itself is idempotent (tracker table guard), so re-running this
// script is safe — already-applied migrations skip.
//
// Requires:
//   - SUPABASE_MANAGEMENT_TOKEN in .env.local (a personal access token
//     from https://supabase.com/dashboard/account/tokens — scope:
//     "create" includes database/query access)
//   - NEXT_PUBLIC_SUPABASE_URL in .env.local (used to derive the project ref)
//
// If SUPABASE_MANAGEMENT_TOKEN is missing, prints the bundle path and
// the manual paste instructions and exits non-zero so CI catches it.
//
// Run: pnpm exec node scripts/apply-phase-v-migrations.mjs

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env.local');
const bundlePath = resolve(__dirname, '..', 'ai-documents', 'W-apply-all.sql');

function loadEnv() {
  let raw = '';
  try {
    raw = readFileSync(envPath, 'utf8');
  } catch {
    return {};
  }
  return Object.fromEntries(
    raw
      .split('\n')
      .filter((l) => l && !l.startsWith('#') && l.includes('='))
      .map((l) => {
        const eq = l.indexOf('=');
        return [
          l.slice(0, eq).trim(),
          l.slice(eq + 1).trim().replace(/^"|"$/g, ''),
        ];
      })
  );
}

const env = loadEnv();
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const TOKEN =
  process.env.SUPABASE_MANAGEMENT_TOKEN || env.SUPABASE_MANAGEMENT_TOKEN;

if (!SUPABASE_URL) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL in .env.local');
  process.exit(1);
}

// Derive project ref from e.g. https://apxuqcvhcfornjlowibj.supabase.co
const projectRefMatch = SUPABASE_URL.match(/^https?:\/\/([a-z0-9]+)\.supabase\.co/);
if (!projectRefMatch) {
  console.error(`Could not parse project ref from URL: ${SUPABASE_URL}`);
  process.exit(1);
}
const PROJECT_REF = projectRefMatch[1];

let bundleSql = '';
try {
  bundleSql = readFileSync(bundlePath, 'utf8');
} catch (err) {
  console.error(`Could not read bundle at ${bundlePath}:`, err.message);
  process.exit(1);
}

if (!TOKEN) {
  console.log('');
  console.log('⚠  SUPABASE_MANAGEMENT_TOKEN not set in .env.local.');
  console.log('');
  console.log('Two options to proceed:');
  console.log('');
  console.log('  A. Generate a personal access token at');
  console.log('     https://supabase.com/dashboard/account/tokens');
  console.log('     then add to .env.local:');
  console.log('       SUPABASE_MANAGEMENT_TOKEN=sbp_...');
  console.log('     and re-run this script.');
  console.log('');
  console.log('  B. Paste the bundle manually:');
  console.log(`       1. Open project ${PROJECT_REF} → SQL Editor`);
  console.log(`       2. Paste contents of ${bundlePath}`);
  console.log('       3. Click Run');
  console.log('       4. Verify with: pnpm exec node scripts/verify-pending-migrations.mjs');
  console.log('');
  process.exit(2);
}

console.log(`[apply-phase-v] target project: ${PROJECT_REF}`);
console.log(`[apply-phase-v] bundle size: ${bundleSql.length} chars`);
console.log('');

const endpoint = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;
console.log(`[apply-phase-v] POST ${endpoint}`);

try {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: bundleSql }),
  });
  const responseText = await res.text();
  if (!res.ok) {
    console.error(`[apply-phase-v] HTTP ${res.status}`);
    console.error(responseText);
    process.exit(1);
  }
  console.log(`[apply-phase-v] HTTP ${res.status} ✅`);
  // The Management API returns the result of the last SELECT, which is
  // our tracker query showing the 10 applied filenames.
  try {
    const parsed = JSON.parse(responseText);
    if (Array.isArray(parsed)) {
      console.log('');
      console.log(`Applied migrations (${parsed.length} rows in tracker):`);
      for (const row of parsed) {
        console.log(`  • ${row.filename}  (${row.applied_at})`);
      }
    } else {
      console.log(responseText.slice(0, 500));
    }
  } catch {
    console.log(responseText.slice(0, 500));
  }
  console.log('');
  console.log('Next: pnpm exec node scripts/verify-pending-migrations.mjs');
} catch (err) {
  console.error('[apply-phase-v] request failed:', err);
  process.exit(1);
}
