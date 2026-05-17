#!/usr/bin/env node
/**
 * Static button/link destination audit.
 *
 * Walks every .tsx file under app/ and components/, extracts the destination
 * strings handed to <Link href>, <a href>, router.push(), and redirect(), then
 * checks each one against the actual filesystem routes under app/ — so we can
 * flag links that point at pages that do not exist yet (e.g. /dashboard/
 * settings/profile, /supplier/proposals, /admin/rfqs).
 *
 * No server needed. Pure FS + regex. Run with:
 *   node scripts/audit-buttons.mjs
 *   node scripts/audit-buttons.mjs --missing-only
 *   node scripts/audit-buttons.mjs --json
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const APP_DIR = join(ROOT, 'app');
const COMPONENTS_DIR = join(ROOT, 'components');

const args = new Set(process.argv.slice(2));
const MISSING_ONLY = args.has('--missing-only');
const AS_JSON = args.has('--json');

// ---------- 1. Build the set of real routes from app/**/page.tsx ----------

function walk(dir) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...walk(full));
    } else if (st.isFile()) {
      out.push(full);
    }
  }
  return out;
}

function pageFileToRoute(absPath) {
  // /abs/.../app/[locale]/(marketing)/for-clients/page.tsx
  // → '/[locale]/for-clients'
  let rel = relative(APP_DIR, absPath).replace(/\\/g, '/');
  rel = rel.replace(/\/page\.tsx$/, '');
  rel = rel.replace(/\/\([^)]+\)/g, ''); // drop route groups
  if (rel === 'page.tsx') return '/';
  return '/' + rel;
}

const PAGE_FILES = walk(APP_DIR).filter((f) => f.endsWith('/page.tsx'));
const ROUTES = PAGE_FILES.map(pageFileToRoute);

// Strip [locale] prefix when present so destinations like /signup can match.
// Keep admin routes as-is (they don't carry a locale).
function normalizeRoute(r) {
  if (r === '/[locale]') return '/';
  return r.replace(/^\/\[locale\]/, '');
}
const NORMALIZED_ROUTES = ROUTES.map(normalizeRoute);

// Build regexes from each route, converting [id] / [chatId] / etc. into [^/]+
function routeToRegex(route) {
  const pattern = route
    .split('/')
    .map((seg) => {
      if (seg === '') return '';
      if (seg.startsWith('[') && seg.endsWith(']')) return '[^/]+';
      return seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('/');
  return new RegExp('^' + pattern + '/?$');
}
const ROUTE_PATTERNS = NORMALIZED_ROUTES.map((r) => ({
  raw: r,
  isDynamic: r.includes('['),
  regex: routeToRegex(r),
}));

// ---------- 2. Extract destinations from every .tsx ----------

const SOURCE_FILES = [
  ...walk(APP_DIR),
  ...walk(COMPONENTS_DIR),
].filter((f) => f.endsWith('.tsx') || f.endsWith('.ts'));

// We want literal-string destinations only. Template literals or variable refs
// are reported as "dynamic" so the user knows they exist but we can't check.
const PATTERNS = [
  // <Link href="..." or <Link href='...'
  { kind: 'Link.href', re: /<Link\b[^>]*\bhref=(["'`])([^"'`]+)\1/g },
  // plain <a href="..."
  { kind: 'a.href', re: /<a\b[^>]*\bhref=(["'`])([^"'`]+)\1/g },
  // router.push('...') / router.replace('...')
  { kind: 'router.push', re: /\brouter\.(?:push|replace)\(\s*(["'`])([^"'`]+)\1/g },
  // redirect('...') — server actions
  { kind: 'redirect()', re: /\bredirect\(\s*(["'`])([^"'`]+)\1/g },
  // <form action="..."
  { kind: 'form.action', re: /<form\b[^>]*\baction=(["'`])([^"'`]+)\1/g },
];

const findings = [];

for (const file of SOURCE_FILES) {
  let src;
  try {
    src = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  for (const { kind, re } of PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(src))) {
      const dest = m[2];
      // Approx line: count newlines up to the match
      const line = src.slice(0, m.index).split('\n').length;
      findings.push({
        file: relative(ROOT, file),
        line,
        kind,
        dest,
      });
    }
  }
}

// ---------- 3. Classify each destination ----------

function classify(dest) {
  if (!dest) return 'EMPTY';
  if (dest.startsWith('#')) return 'ANCHOR';
  if (dest.startsWith('mailto:') || dest.startsWith('tel:')) return 'EXTERNAL';
  if (/^https?:\/\//.test(dest)) return 'EXTERNAL';
  if (dest.startsWith('?')) return 'QUERY-ONLY';
  if (!dest.startsWith('/')) return 'RELATIVE';

  // Strip query string + fragment + trailing slash for matching
  const clean = dest.split('?')[0].split('#')[0].replace(/\/$/, '') || '/';

  // Try direct match against routes (admin/* won't have locale).
  for (const r of ROUTE_PATTERNS) {
    if (r.regex.test(clean)) {
      return r.isDynamic ? 'OK-dynamic' : 'OK';
    }
  }

  // Try with /ar or /en stripped — some links are written with explicit locale
  const localeStripped = clean.replace(/^\/(?:ar|en)(?=\/|$)/, '') || '/';
  if (localeStripped !== clean) {
    for (const r of ROUTE_PATTERNS) {
      if (r.regex.test(localeStripped)) {
        return r.isDynamic ? 'OK-dynamic' : 'OK';
      }
    }
  }

  return 'MISSING';
}

const classified = findings.map((f) => ({ ...f, status: classify(f.dest) }));

// ---------- 4. Report ----------

if (AS_JSON) {
  process.stdout.write(JSON.stringify({ routes: NORMALIZED_ROUTES, findings: classified }, null, 2));
  process.exit(0);
}

const groups = {};
for (const f of classified) {
  (groups[f.status] ??= []).push(f);
}

const STATUS_ORDER = [
  'MISSING',
  'OK',
  'OK-dynamic',
  'EXTERNAL',
  'ANCHOR',
  'EMPTY',
  'QUERY-ONLY',
  'RELATIVE',
];

function row(f) {
  return `  ${f.file}:${f.line} (${f.kind})  →  ${f.dest}`;
}

console.log(`\nButton/Link audit — ${classified.length} destinations found across ${SOURCE_FILES.length} source files`);
console.log(`Routes available: ${NORMALIZED_ROUTES.length} pages`);
console.log('─'.repeat(80));

let missingCount = 0;
for (const status of STATUS_ORDER) {
  const items = groups[status];
  if (!items || items.length === 0) continue;
  if (MISSING_ONLY && status !== 'MISSING') continue;
  console.log(`\n[${status}] — ${items.length}`);
  // Deduplicate by file+line+dest
  const seen = new Set();
  for (const f of items) {
    const key = `${f.file}|${f.line}|${f.dest}`;
    if (seen.has(key)) continue;
    seen.add(key);
    console.log(row(f));
  }
  if (status === 'MISSING') missingCount = items.length;
}

console.log('\n' + '─'.repeat(80));
if (missingCount > 0) {
  console.log(`Summary: ${missingCount} destination(s) point at pages that don't exist.`);
  process.exitCode = 1;
} else {
  console.log('Summary: all literal destinations resolve to real routes.');
}
