// Reusable helpers for the deep audit. Mirrors the cookie-injection
// pattern proven in MVP verification. Not deleted between sections —
// every audit sub-section imports from here.

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const e = l.indexOf('=');
      return [l.slice(0, e).trim(), l.slice(e + 1).trim().replace(/^"|"$/g, '')];
    })
);

export const PROJECT_REF = env.NEXT_PUBLIC_SUPABASE_URL.match(/https:\/\/([^.]+)\./)[1];
export const COOKIE_NAME = `sb-${PROJECT_REF}-auth-token`;
export const BASE = 'http://localhost:3000';
export const ENV = env;

export const adminSb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const PERSONA = {
  client: ['ahmed.client.test@example.com', 'TestClient2026!'],
  supplier: ['m.supplier.test@example.com', 'TestSupplier2026!'],
  admin: ['sara.admin.test@example.com', 'TestAdmin2026!'],
  pending: ['sami.newsupplier+test1111@outlook.com', 'NewSupplier2026!'],
};

export async function getCookieFor(persona) {
  const [email, password] = PERSONA[persona];
  if (!email) throw new Error(`unknown persona: ${persona}`);
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
  const { data, error } = await anon.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`signin ${persona}: ${error.message}`);
  return `${COOKIE_NAME}=base64-${Buffer.from(JSON.stringify(data.session), 'utf8').toString('base64')}`;
}

export async function fetchPage(path, cookie) {
  const r = await fetch(BASE + path, {
    headers: cookie ? { cookie } : {},
    redirect: 'manual',
  });
  const html = r.status === 200 ? await r.text() : '';
  return { status: r.status, location: r.headers.get('location'), html };
}

export function pad(s, n) {
  s = String(s);
  return s.length >= n ? s : s + ' '.repeat(n - s.length);
}

export function logResult(item, ok, detail = '') {
  console.log(`  ${ok ? '✅' : '❌'} ${item}${detail ? '  ['+detail+']' : ''}`);
}
