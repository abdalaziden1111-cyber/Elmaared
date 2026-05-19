import { ErrorRecoveryLayout } from '@/components/error-states/error-recovery-layout';

// UX Plan v2 §7 scenario 7 — adversarial: buyer or supplier tries to
// move the negotiation off Elmaared (phone numbers / emails in chat).
// Medium severity. Pattern: warn that contact info is hidden until
// Escrow, then explain WHY (dispute protection lives on-platform).

export default function RfqLeakedOffplatformPage() {
  return (
    <ErrorRecoveryLayout
      scenarioId="rfq_leaked_offplatform"
      severity="medium"
      title="نحمي بياناتك الشخصية بسبب هذه الرسالة"
      reassurance="رصد النظام محاولة لتبادل معلومات اتصال خارج Elmaared قبل إيداع الأمانة. هذه التفاصيل تبقى مخفية حتى بعد الدفع، لأنّ أي خلاف يحدث خارج المنصة لا تستطيع وساطتنا حلّه. بمجرد إيداع الأمانة، تتبادل الأطراف معلومات الاتصال بأمان وبطريقة موثّقة."
      actions={[
        {
          label: 'افتح المحادثة',
          internalHref: '/ar/dashboard/rfqs',
          emphasis: 'primary',
        },
        {
          label: 'لماذا نحمي معلومات الاتصال؟',
          internalHref: '/ar/legal/terms',
        },
      ]}
    />
  );
}
