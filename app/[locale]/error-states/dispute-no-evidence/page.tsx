import { ErrorRecoveryLayout } from '@/components/error-states/error-recovery-layout';

// UX Plan v2 §7 scenario 8 — both sides disagree, neither has photos or
// solid messages. Medium severity. Pattern: walk through the 3-level
// dispute ladder, note that arbitration is binding, and explain that
// the loser pays the arbitration fee (deterrent against frivolous
// escalation).

export default function DisputeNoEvidencePage({
  searchParams,
}: {
  searchParams?: { ref?: string };
}) {
  return (
    <ErrorRecoveryLayout
      scenarioId="dispute_no_evidence"
      severity="medium"
      title="لا توجد أدلة كافية — لكن لدينا طريق منظّم"
      reassurance="نزاعات الـ Elmaared تمرّ بثلاث مستويات: (١) حلّ ودي بين الطرفين، (٢) وساطة من فريق Customer Success، (٣) لجنة تحكيم ملزمة لكلا الطرفين. إذا انتقلتم للمستوى الثالث، AI يحلّل المحادثة كاملةً لتعزيز قرار اللجنة، ويدفع الخاسر رسوم التحكيم. هذا يضمن الجدية ويردع المطالبات غير المستحقة."
      reference={searchParams?.ref ?? null}
      actions={[
        {
          label: 'ابدأ بحلّ ودي',
          internalHref: '/ar/dashboard/rfqs',
          emphasis: 'primary',
        },
        {
          label: 'كلّم وسيطاً مباشرة',
          href: 'https://wa.me/966500000000',
        },
      ]}
    />
  );
}
