import { ErrorRecoveryLayout } from '@/components/error-states/error-recovery-layout';

// UX Plan v2 §7 scenario 5 — buyer wants to cancel AFTER kickoff. Not
// quite an "error" but the recovery flow lives here: pro-rated refund,
// mediation offer, express refund if both sides agree. Severity: medium
// — the platform handles cancellation gracefully; supplier already
// invested time in prep.

export default function CancellationWizardPage({
  searchParams,
}: {
  searchParams?: { rfq?: string };
}) {
  return (
    <ErrorRecoveryLayout
      scenarioId="cancellation_wizard"
      severity="medium"
      title="إلغاء بعد بدء التنفيذ — لنسوّيها معاً"
      reassurance="فهمنا أن الظروف تتغيّر. عندنا ٤ خطوات تحفظ حقك وحق المورد: (١) نفهم ما حالة المشروع، (٢) AI يحسب إرجاع نسبي عادل، (٣) نعرض عليك خيار وساطة قبل القرار النهائي، (٤) لو الاتفاق ودي، الإرجاع يصلك خلال ٤٨ ساعة."
      reference={searchParams?.rfq ?? null}
      actions={[
        {
          label: 'ابدأ الإلغاء المنظّم',
          internalHref: '/ar/dashboard/rfqs',
          emphasis: 'primary',
        },
        {
          label: 'كلّمنا قبل الإلغاء',
          href: 'https://wa.me/966500000000',
        },
      ]}
    />
  );
}
