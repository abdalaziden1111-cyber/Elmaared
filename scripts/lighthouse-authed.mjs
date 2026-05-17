// Lighthouse needs an authenticated cookie for /dashboard and /admin.
// Easiest path: write a chrome user data dir with the cookie pre-set,
// then run lighthouse against it. But that's heavy.
//
// Simpler: we already proved earlier that dev-mode render is in the
// 800-1200ms range for protected pages. We'll run Lighthouse only on the
// public homepage where it's most meaningful, and synthesize a
// representative perf number for protected pages from the bench script.
//
// For Lighthouse on protected pages we use a manual cookie via the
// --extra-headers flag. Lighthouse supports this.

import { writeFileSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(readFileSync('.env.local','utf8').split('\n').filter(l=>l&&!l.startsWith('#')&&l.includes('=')).map(l=>{const e=l.indexOf('=');return [l.slice(0,e).trim(),l.slice(e+1).trim().replace(/^"|"$/g,'')]}));
const PROJECT_REF = env.NEXT_PUBLIC_SUPABASE_URL.match(/https:\/\/([^.]+)\./)[1];

async function getCookie(email, pw) {
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { data, error } = await sb.auth.signInWithPassword({ email, password: pw });
  if (error) throw error;
  return `sb-${PROJECT_REF}-auth-token=base64-${Buffer.from(JSON.stringify(data.session),'utf8').toString('base64')}`;
}

async function runLighthouse(url, outFile, cookie) {
  const headers = cookie ? `{"Cookie":"${cookie}"}` : null;
  const headersArg = headers ? `--extra-headers='${headers}'` : '';
  const cmd = `CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npx --yes lighthouse@latest "${url}" --output=json --output-path=${outFile} --chrome-flags="--headless --no-sandbox" --quiet --only-categories=performance,accessibility,best-practices,seo --max-wait-for-load=30000 ${headersArg}`;
  execSync(cmd, { stdio: ['ignore','ignore','pipe'] });
  const r = JSON.parse(readFileSync(outFile, 'utf8'));
  return {
    perf: Math.round(r.categories.performance.score * 100),
    a11y: Math.round(r.categories.accessibility.score * 100),
    bp: Math.round(r.categories['best-practices'].score * 100),
    seo: Math.round(r.categories.seo.score * 100),
    fcp: r.audits['first-contentful-paint'].displayValue,
    lcp: r.audits['largest-contentful-paint'].displayValue,
    tbt: r.audits['total-blocking-time'].displayValue,
    cls: r.audits['cumulative-layout-shift'].displayValue,
    a11yFails: r.categories.accessibility.auditRefs.filter(a=>r.audits[a.id].score!==null && r.audits[a.id].score<1).map(a => a.id),
  };
}

console.log('Running Lighthouse on /ar/dashboard (client)…');
const clientCookie = await getCookie('ahmed.client.test@example.com', 'TestClient2026!');
const dashboard = await runLighthouse('http://localhost:3000/ar/dashboard', '.lighthouse/ar-dashboard.json', clientCookie);
console.log(dashboard);

console.log('\nRunning Lighthouse on /admin (admin)…');
const adminCookie = await getCookie('sara.admin.test@example.com', 'TestAdmin2026!');
const admin = await runLighthouse('http://localhost:3000/admin', '.lighthouse/admin.json', adminCookie);
console.log(admin);
