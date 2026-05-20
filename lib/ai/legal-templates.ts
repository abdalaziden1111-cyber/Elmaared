// Phase V1.2 — Saudi commercial-law clause templates injected into the
// agreement-analysis system prompt. Gives the AI a reference baseline so
// it can flag deviations as "risky" rather than guessing at norms.
//
// TODO: legal-review — these templates are starting points based on common
// Saudi B2B patterns. Before production they MUST be reviewed and signed
// off by an MoCI-licensed commercial lawyer. Do not advertise the AI
// agreement analysis as legal counsel; it's a checklist nudge, not advice.
//
// Each template is Arabic-first because the entire chat + agreement flow
// is in Arabic. The AI sees them verbatim as part of the system prompt.

export const TEMPLATE_VERSION = '2026-05-v1' as const;

/**
 * Standard escrow language — what a typical Elmaared 50/50 split looks
 * like. Deviations: down-payment over 60%, no platform escrow involvement,
 * non-SAR currency, or release conditions outside platform control.
 */
export const ESCROW_CLAUSE_STANDARD = `بنود حساب الأمانة (الإسكرو) المعتاد على منصة Elmaared:
• إيداع ٥٠٪ من قيمة العقد عند التوقيع، يُحتجز في حساب أمانة Elmaared™.
• الإفراج عن الدفعة الأولى للمورد بعد تأكيد الإدارة لاستلام الإيداع.
• الـ٥٠٪ المتبقية تُدفع عند اعتماد العميل للتسليم النهائي.
• العملة المعتمدة: الريال السعودي (SAR) — أي عملة أخرى تعتبر انحرافاً.
• شروط الإفراج تخضع للمنصة فقط — لا تحويلات مباشرة بين الطرفين.
انحرافات شائعة تستحق التنبيه: دفعة أولى أعلى من ٦٠٪، دفع نقدي خارج المنصة، عملة غير الريال، شروط إفراج خارج تحكم Elmaared.`;

/**
 * Payment-terms norms — net-X days after invoice, partial payments,
 * milestones, late-payment penalties.
 */
export const PAYMENT_TERMS_NORMS_SA = `بنود الدفع المعتادة في السوق السعودي B2B:
• الدفعة الثانية تُسدّد خلال ١٤–٣٠ يوماً من اعتماد التسليم النهائي.
• الفواتير ZATCA-متوافقة (ضريبة القيمة المضافة ١٥٪ ظاهرة).
• تأخّر الدفع لأكثر من ٤٥ يوماً يستوجب إشعاراً رسمياً قبل أي تصعيد.
انحرافات شائعة: شروط دفع تتجاوز ٦٠ يوماً، عدم ذكر VAT، عدم وضوح آلية الإشعار في حالات التأخير.`;

/**
 * Force-majeure clause anchored to Saudi commercial usage (sandstorm,
 * mosque-prayer scheduling, government-mandated event cancellations).
 */
export const FORCE_MAJEURE_SA = `بنود القوة القاهرة المعتادة في عقود الفعاليات بالسعودية:
• الأحوال الجوية القاسية (عواصف رملية، أمطار غزيرة) مع إشعار خلال ٤٨ ساعة.
• تأجيلات حكومية للفعاليات (وزارة الإعلام، البلديات) — تمتد المدد تلقائياً.
• تعطّل المرافق الحكومية أو إغلاق الطرق المؤدية للموقع.
• لا تشمل القوة القاهرة: قلة الموارد الداخلية للمورد، نقص العمالة، تأخّر الموردين الفرعيين.
انحرافات شائعة: تعريف فضفاض للقوة القاهرة يشمل أي عذر تشغيلي، أو غياب آلية إثبات.`;

/**
 * Dispute-resolution — defaults to Saudi commercial courts in the city
 * where the work is performed; Najiz e-litigation portal is the standard
 * online path before in-person hearings.
 */
export const DISPUTE_RESOLUTION_SAUDI_COURTS = `آلية حلّ النزاعات المعتادة:
• تصعيد داخلي عبر زر "تصعيد" (Panic Button) في المحادثة — Admin يدخل كطرف ثالث.
• إذا لم يُحلّ خلال ٧ أيام، يُحال للمحكمة التجارية في المدينة التي نُفّذ فيها العمل.
• البوابة الإلكترونية "ناجز" (najiz.sa) هي القناة الرسمية الأولى للدعاوى التجارية.
• القانون الحاكم: نظام المحاكم التجارية السعودي + اللوائح التنفيذية.
انحرافات شائعة: التحكيم الإجباري خارج السعودية، اشتراط القانون الأجنبي، تجاوز التصعيد الداخلي قبل المحكمة.`;

/**
 * VAT/ZATCA — every commercial transaction over the registration threshold
 * needs a ZATCA-compliant invoice with VAT separately stated.
 */
export const VAT_CLAUSE_ZATCA = `بند ضريبة القيمة المضافة (ZATCA):
• كل المبالغ يُذكر صراحةً ما إذا كانت شاملة أو غير شاملة لـ VAT ١٥٪.
• المورد المسجّل في ZATCA يجب أن يُصدر فاتورة ضريبية إلكترونية متوافقة (E-Invoicing Phase 2).
• المنصة تُصدر فاتورة العمولة + VAT الخاصة بها مستقلة عن فاتورة المورد للعميل.
انحرافات شائعة: عدم ذكر VAT في الأسعار، فاتورة ورقية أو غير ZATCA، خلط عمولة المنصة مع قيمة الخدمة.`;

/**
 * Convenience: build the full legal context block to inject into the
 * agreement-analysis system prompt. Versioned so the cache key changes
 * when templates evolve (forces a re-score, prevents stale risk flags).
 */
export function buildLegalContext(): string {
  return [
    `=== مرجع البنود التجارية السعودية المعتادة (إصدار ${TEMPLATE_VERSION}) ===`,
    '',
    ESCROW_CLAUSE_STANDARD,
    '',
    PAYMENT_TERMS_NORMS_SA,
    '',
    FORCE_MAJEURE_SA,
    '',
    DISPUTE_RESOLUTION_SAUDI_COURTS,
    '',
    VAT_CLAUSE_ZATCA,
    '',
    '=== انتهاء المرجع ===',
  ].join('\n');
}

export const _LEGAL_TEMPLATES_FOR_TEST = {
  ESCROW_CLAUSE_STANDARD,
  PAYMENT_TERMS_NORMS_SA,
  FORCE_MAJEURE_SA,
  DISPUTE_RESOLUTION_SAUDI_COURTS,
  VAT_CLAUSE_ZATCA,
};
