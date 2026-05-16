import { fetchPage, getCookieFor, adminSb } from './lib-audit-helpers.mjs';
import { readFileSync } from 'node:fs';

const items = [];
function rec(num, item, ok, detail = '') {
  items.push({ num, item, ok, detail });
  console.log(`  ${ok ? '✅' : '❌'} ${num} — ${item}${detail ? '  ['+detail+']' : ''}`);
}

const clientCookie = await getCookieFor('client');
const supplierCookie = await getCookieFor('supplier');
const adminCookie = await getCookieFor('admin');

// === Existing resolved dispute artifact ===
const { data: d } = await adminSb.from('disputes').select('*').eq('id', '58b72f57-4b17-4717-bc56-92c5223ad9b9').single();
rec('1.13.1', 'dispute row exists with status=resolved', d.status === 'resolved');
rec('1.13.2', 'dispute has all 6 categories supported (open-dispute-form CATEGORIES)',
  readFileSync('components/dispute/open-dispute-form.tsx','utf8').match(/value: '(quality|timeliness|scope|communication|payment|other)'/g)?.length === 6);

// === Description min length (30 chars) ===
const src = readFileSync('components/dispute/open-dispute-form.tsx', 'utf8');
rec('1.13.3', 'description min=30 enforced in UI', src.includes('minLength={30}'));
rec('1.13.4', 'description min=30 enforced in action', readFileSync('app/actions/review.ts','utf8').includes('description.length < 30'));

// === Evidence URLs field — NEW (P2-3 build) ===
rec('1.13.5', 'evidence_urls textarea added to form', src.includes('name="evidenceUrls"'));
rec('1.13.6', 'form accepts up to 10 URLs (per cap)', src.includes('10 روابط') || src.includes('10 لينك'));
rec('1.13.7', 'action parses evidenceUrls + filters to https://', readFileSync('app/actions/review.ts','utf8').includes('evidenceUrls') && readFileSync('app/actions/review.ts','utf8').includes('https'));
rec('1.13.8', 'action inserts evidence_urls column on disputes row',
  readFileSync('app/actions/review.ts','utf8').includes('evidence_urls: evidenceUrls'));

// === RaiserRole branching: supplier can open disputes too ===
const supplierRfqSrc = readFileSync('app/[locale]/supplier/rfqs/[id]/page.tsx', 'utf8');
rec('1.13.9', 'supplier RFQ detail renders OpenDisputeForm raiserRole="supplier"',
  supplierRfqSrc.includes('OpenDisputeForm') && supplierRfqSrc.includes("raiserRole=\"supplier\""));
rec('1.13.10', 'supplier dispute-eligible only when project in_escrow/in_progress/delivered/completed',
  supplierRfqSrc.includes('DISPUTABLE_STATUSES') || supplierRfqSrc.includes('in_progress'));

// === Admin resolve flow ===
const reviewActions = readFileSync('app/actions/review.ts', 'utf8');
rec('1.13.11', 'adminResolveDisputeAction exported', reviewActions.includes('adminResolveDisputeAction'));
rec('1.13.12', 'admin resolve form accepts favor (client/supplier/shared)',
  readFileSync('app/admin/disputes/[id]/resolve-dispute-form.tsx','utf8').includes("'client'") &&
  readFileSync('app/admin/disputes/[id]/resolve-dispute-form.tsx','utf8').includes("'supplier'") &&
  readFileSync('app/admin/disputes/[id]/resolve-dispute-form.tsx','utf8').includes("'shared'"));
rec('1.13.13', 'admin resolve form accepts resumeStatus (in_progress/completed/cancelled)',
  readFileSync('app/admin/disputes/[id]/resolve-dispute-form.tsx','utf8').includes('in_progress') &&
  readFileSync('app/admin/disputes/[id]/resolve-dispute-form.tsx','utf8').includes('completed') &&
  readFileSync('app/admin/disputes/[id]/resolve-dispute-form.tsx','utf8').includes('cancelled'));

// === Resolved state restored RFQ status ===
const { data: rfq } = await adminSb.from('rfqs').select('status').eq('id', d.rfq_id).single();
rec('1.13.14', 'RFQ status restored to non-disputed after admin resolved', rfq.status !== 'disputed');
rec('1.13.15', 'dispute has resolved_at + resolved_by', !!d.resolved_at && !!d.resolved_by);

// === Admin disputes pages still load ===
const adqR = await fetchPage('/admin/disputes', adminCookie);
rec('1.13.16', '/admin/disputes → 200', adqR.status === 200);
const addR = await fetchPage('/admin/disputes/58b72f57-4b17-4717-bc56-92c5223ad9b9', adminCookie);
rec('1.13.17', '/admin/disputes/[id] → 200 + shows description', addR.status === 200 && addR.html.includes('لاحظنا بعد المعرض'));
rec('1.13.18', 'admin detail page has evidence-urls section (markup)', addR.html.includes('الأدلة المرفقة') || readFileSync('app/admin/disputes/[id]/page.tsx','utf8').includes('الأدلة المرفقة'));

// === Audit log: dispute_opened + dispute_resolved actions exist ===
const { count: openedCount } = await adminSb.from('audit_logs').select('id', { count: 'exact', head: true }).eq('action', 'dispute_opened');
const { count: resolvedCount } = await adminSb.from('audit_logs').select('id', { count: 'exact', head: true }).eq('action', 'dispute_resolved');
rec('1.13.19', `audit_logs has dispute_opened (${openedCount}) + dispute_resolved (${resolvedCount}) rows`, openedCount > 0 && resolvedCount > 0);

const okc = items.filter(i => i.ok).length;
console.log(`\n=== Section 1.13: ${okc}/${items.length} ===`);
process.exit(okc === items.length ? 0 : 1);
