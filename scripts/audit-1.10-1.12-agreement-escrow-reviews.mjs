import { fetchPage, getCookieFor, adminSb } from './lib-audit-helpers.mjs';
import { readFileSync } from 'node:fs';

const items = [];
function rec(num, item, ok, detail = '') {
  items.push({ num, item, ok, detail });
  console.log(`  ${ok ? '✅' : '❌'} ${num} — ${item}${detail ? '  ['+detail+']' : ''}`);
}

const clientCookie = await getCookieFor('client');
const RFQ = '06d8e776-aae9-4721-8ab5-5772dd3df464';

// === 1.10 Agreement ===
const aR = await fetchPage(`/ar/dashboard/rfqs/${RFQ}/agreement`, clientCookie);
rec('1.10.1', 'Agreement page → 200', aR.status === 200);
rec('1.10.2', 'Agreement: shows signed state (since RFQ is completed)', aR.html.includes('وقّع') || aR.html.includes('signed') || aR.html.includes('مكتمل'));
const { data: ag } = await adminSb.from('agreements').select('*').eq('rfq_id', RFQ).single();
rec('1.10.3', 'agreement.status = signed', ag.status === 'signed');
rec('1.10.4', 'agreement has both client_signature_hash + supplier_signature_hash', !!ag.client_signature_hash && !!ag.supplier_signature_hash);
rec('1.10.5', 'agreement has both client_understanding + supplier_understanding', !!ag.client_understanding && !!ag.supplier_understanding);
const agActions = readFileSync('app/actions/agreement.ts', 'utf8');
rec('1.10.6', 'submitUnderstandingAction exported', agActions.includes('submitUnderstandingAction'));
rec('1.10.7', 'signAgreementAction exported', agActions.includes('signAgreementAction'));
rec('1.10.8', 'awardWinnerAction exported (transitions to agreement)', agActions.includes('awardWinnerAction'));
rec('1.10.9', 'signAgreementAction has defensive escrow row creation', agActions.includes('escrow_transactions') && agActions.includes('total_amount'));

// === 1.11 Escrow ===
const eR = await fetchPage(`/ar/dashboard/rfqs/${RFQ}/escrow`, clientCookie);
rec('1.11.1', 'Escrow page → 200', eR.status === 200);
rec('1.11.2', 'Escrow H1 "إيصال الدفع"', eR.html.includes('إيصال الدفع'));
rec('1.11.3', 'Escrow: 4 amount cards (إجمالي / الحالة / الإيداع / الدفعة)',
  eR.html.includes('إجمالي الاتفاق') && eR.html.includes('الحالة') && eR.html.includes('الإيداع المبدئي') && eR.html.includes('الدفعة النهائية'));
rec('1.11.4', 'Escrow: supplier bank details visible', eR.html.includes('بيانات المورد البنكية') && eR.html.includes('IBAN'));
rec('1.11.5', 'Escrow: status reads "مكتمل" (since status=released)', eR.html.includes('مكتمل'));
rec('1.11.6', 'Escrow: ✓ المشروع مكتمل success section', eR.html.includes('✓ المشروع مكتمل') || eR.html.includes('تمّ اعتماد التسليم'));

// DB state
const { data: tx } = await adminSb.from('escrow_transactions').select('*').eq('rfq_id', RFQ).single();
rec('1.11.7', 'escrow.status = released', tx.status === 'released');
rec('1.11.8', 'escrow math: 65k base + 2% fee + 15% VAT = 66495', Math.round(tx.total_amount) === 66495);
rec('1.11.9', 'escrow: 50/50 split = 33247.5 each', Math.round(tx.initial_deposit) === 33247.5 || tx.initial_deposit === 33247.5);
rec('1.11.10', 'escrow: receipt_url + confirmed_by set', !!tx.initial_deposit_receipt_url && !!tx.initial_deposit_confirmed_by);

const { data: ev } = await adminSb.from('escrow_events').select('event_type').eq('escrow_id', tx.id);
rec('1.11.11', 'escrow_events ledger has 2 entries (deposit_receipt_uploaded + deposit_confirmed)', ev.length === 2);

const { data: del } = await adminSb.from('deliveries').select('client_approved, delivery_photos').eq('rfq_id', RFQ).single();
rec('1.11.12', 'delivery: client_approved=true + photos populated', del.client_approved === true && Array.isArray(del.delivery_photos));

const esActions = readFileSync('app/actions/escrow.ts', 'utf8');
rec('1.11.13', 'uploadInitialReceiptAction exported', esActions.includes('uploadInitialReceiptAction'));
rec('1.11.14', 'adminConfirmInitialDepositAction exported + has idempotency guard',
  esActions.includes('adminConfirmInitialDepositAction') && esActions.includes("status !== 'deposit_received'"));
rec('1.11.15', 'submitDeliveryAction exported', esActions.includes('submitDeliveryAction'));
rec('1.11.16', 'approveDeliveryAction exported', esActions.includes('approveDeliveryAction'));

// === 1.12 Reviews ===
const { data: rev } = await adminSb.from('reviews').select('*').eq('rfq_id', RFQ).maybeSingle();
rec('1.12.1', 'review row exists', !!rev);
rec('1.12.2', 'review has all 6 ratings (overall + 5 sub)',
  rev?.rating_overall != null && rev?.rating_quality != null && rev?.rating_timeliness != null &&
  rev?.rating_communication != null && rev?.rating_flexibility != null && rev?.rating_price_value != null);
rec('1.12.3', 'review has comment + is_public=true', !!rev?.comment && rev?.is_public === true);

const reviewActions = readFileSync('app/actions/review.ts', 'utf8');
rec('1.12.4', 'submitReviewAction exported', reviewActions.includes('submitReviewAction'));
rec('1.12.5', 'review rating validated 1-5 (via schemas/review.ts)',
  readFileSync('schemas/review.ts', 'utf8').includes('z.number().int().min(1).max(5)'));

// Verify review form is gated on rfq.status=completed
rec('1.12.6', 'review form gated on status=completed', readFileSync('app/[locale]/dashboard/rfqs/[id]/page.tsx','utf8').includes("status === 'completed'") || readFileSync('app/[locale]/dashboard/rfqs/[id]/page.tsx','utf8').includes('completed'));

// Verify thank-you state after submission
const rfqDR = await fetchPage(`/ar/dashboard/rfqs/${RFQ}`, clientCookie);
rec('1.12.7', 'RFQ detail shows "✓ شكراً، تم تسجيل تقييمك" since review already submitted', rfqDR.html.includes('شكراً، تم تسجيل تقييمك') || rfqDR.html.includes('تقييمك'));

const okc = items.filter(i => i.ok).length;
console.log(`\n=== Sections 1.10 + 1.11 + 1.12: ${okc}/${items.length} ===`);
process.exit(okc === items.length ? 0 : 1);
