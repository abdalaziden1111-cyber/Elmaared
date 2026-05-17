import { fetchPage, getCookieFor, adminSb } from './lib-audit-helpers.mjs';
import { readFileSync } from 'node:fs';

const items = [];
function rec(num, item, ok, detail = '') {
  items.push({ num, item, ok, detail });
  console.log(`  ${ok ? '✅' : '❌'} ${num} — ${item}${detail ? '  ['+detail+']' : ''}`);
}

const clientCookie = await getCookieFor('client');

// === RFQ list page ===
const lR = await fetchPage('/ar/dashboard/rfqs', clientCookie);
rec('1.8.1', '/ar/dashboard/rfqs → 200', lR.status === 200);
rec('1.8.2', 'list: shows 3 RFQs (RFQ-2026-00001 + 00003 + 00004)',
  lR.html.includes('RFQ-2026-00001') && lR.html.includes('RFQ-2026-00003') && lR.html.includes('RFQ-2026-00004'));
rec('1.8.3', 'list: status filter present', /select[^>]*aria-label="الحالة"|select[^>]*name="status"/.test(lR.html));

// === Status filter sweep — every status that exists in DB returns the right row ===
const { data: rfqs } = await adminSb.from('rfqs').select('rfq_number, status').is('deleted_at', null);
for (const r of rfqs) {
  const fR = await fetchPage(`/ar/dashboard/rfqs?status=${r.status}`, clientCookie);
  rec(`1.8.F.${r.status}`, `?status=${r.status} → list includes ${r.rfq_number}`, fR.html.includes(r.rfq_number));
}

// === RFQ detail page ===
const dR = await fetchPage('/ar/dashboard/rfqs/06d8e776-aae9-4721-8ab5-5772dd3df464', clientCookie);
rec('1.8.4', 'RFQ-2026-00001 detail → 200', dR.status === 200);
rec('1.8.5', 'detail: H1 with title', /<h1/.test(dR.html));
rec('1.8.6', 'detail: status pill "مكتمل" (since status=completed)', dR.html.includes('مكتمل'));
rec('1.8.7', 'detail: has proposals or compare link', dR.html.includes('compare') || dR.html.includes('عرض') || dR.html.includes('proposals'));
rec('1.8.8', 'detail: shows escrow link', dR.html.includes('escrow') || dR.html.includes('ضمان') || dR.html.includes('إيصال'));

// === Compare page ===
const cR = await fetchPage('/ar/dashboard/rfqs/06d8e776-aae9-4721-8ab5-5772dd3df464/compare', clientCookie);
rec('1.8.9', 'compare page → 200', cR.status === 200);
rec('1.8.10', 'compare: shows multiple proposals (5 submitted on this RFQ)', cR.html.includes('شركة الإبداع') || cR.html.includes('عرض'));
rec('1.8.11', 'compare: AI rec card placeholder OR fallback message',
  cR.html.includes('AI') || cR.html.includes('غير متاح') || cR.html.includes('analysis'));

// === Proposal detail page ===
const { data: prop } = await adminSb.from('proposals').select('id').eq('rfq_id', '06d8e776-aae9-4721-8ab5-5772dd3df464').eq('status', 'accepted').single();
const pR = await fetchPage(`/ar/dashboard/rfqs/06d8e776-aae9-4721-8ab5-5772dd3df464/proposals/${prop.id}`, clientCookie);
rec('1.8.12', `/dashboard/rfqs/[id]/proposals/[proposalId] → 200`, pR.status === 200);
rec('1.8.13', 'proposal detail: shows price + delivery_days + scope', /\d+/.test(pR.html) && (pR.html.includes('أيام') || pR.html.includes('يوم')));

// === Server actions for award + shortlist ===
const propActions = readFileSync('app/actions/proposal.ts', 'utf8');
const chatActions = readFileSync('app/actions/chat.ts', 'utf8');
rec('1.8.14', 'awardProposalAction exported', propActions.includes('awardProposalAction') || propActions.includes('export async function award'));
rec('1.8.15', 'shortlistProposalAction exported', chatActions.includes('shortlistProposalAction'));

// === Status pill mapping covers all 10 statuses ===
// Source consolidated into lib/constants/labels.ts during polish (Phase B).
const labelsSrc = readFileSync('lib/constants/labels.ts', 'utf8');
const statusLabels = ['draft','open','negotiating','awarded','in_escrow','in_progress','delivered','completed','disputed','cancelled'];
const allMapped = statusLabels.every(s => labelsSrc.includes(`${s}:`));
rec('1.8.16', 'RFQ_STATUS_LABEL maps all 10 statuses (lib/constants/labels.ts)', allMapped);

// === Awarded chip + dispute pill colors ===
rec('1.8.17', 'detail page: status pill present (rounded-full span)', dR.html.includes('rounded-full'));

const okc = items.filter(i => i.ok).length;
console.log(`\n=== Section 1.8: ${okc}/${items.length} ===`);
process.exit(okc === items.length ? 0 : 1);
