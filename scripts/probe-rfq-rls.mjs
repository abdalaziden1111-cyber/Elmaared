import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter((l) => l && !l.startsWith('#')).map((l) => {
      const i = l.indexOf('='); let v = l.slice(i + 1);
      if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
      return [l.slice(0, i), v];
    })
);
const adminCli = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const userCli = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const rfqId = process.argv[2];
if (!rfqId) { console.error('Usage: node probe-rfq-rls.mjs <rfqId>'); process.exit(1); }

// 1. Sign in as the client
const { data: signin, error: sErr } = await userCli.auth.signInWithPassword({
  email: 'ahmed.client.test@example.com',
  password: 'TestClient2026!',
});
console.log('signin:', sErr ? sErr.message : `OK uid=${signin.user.id}`);

// 2. Read as user
const { data: asUser, error: uErr } = await userCli
  .from('rfqs')
  .select('id, title, client_id, status')
  .eq('id', rfqId)
  .maybeSingle();
console.log('asUser:', uErr ? `ERR: ${uErr.message}` : asUser);

// 3. Read as admin
const { data: asAdmin } = await adminCli
  .from('rfqs')
  .select('id, title, client_id, status')
  .eq('id', rfqId)
  .maybeSingle();
console.log('asAdmin:', asAdmin);
