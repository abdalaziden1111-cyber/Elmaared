import { ErrorRecoveryLayout } from '@/components/error-states/error-recovery-layout';

// UX Plan v2 §7 scenario 2 — عين السوق can't generate a recommendation
// because the historical sample is too small. Severity: medium. Pattern:
// AI says "أمامي صفقتين فقط — لا أعرف بعد" instead of inventing a number.

export default function AiNoRecommendationPage() {
  return (
    <ErrorRecoveryLayout
      scenarioId="ai_no_recommendation"
      severity="medium"
      title="عين السوق صريحة: لا توجد بيانات كافية بعد"
      reassurance="لم نجد عدداً كافياً من العروض السابقة في هذه الفئة، ولن نخترع رقماً لا نثق به. يمكنك المضيّ بإحدى طريقتين: (١) ابعث RFQ وستصلك عروض حقيقية خلال ٢٤ ساعة فنبني عليها التقدير، أو (٢) اطلب تقديراً مخصصاً من فريقنا."
      actions={[
        {
          label: 'أنشئ RFQ الآن',
          internalHref: '/ar/dashboard/rfqs/new',
          emphasis: 'primary',
        },
        {
          label: 'اطلب تقديراً مخصصاً',
          href: 'mailto:ops@elmaared.com',
        },
      ]}
    />
  );
}
