import { ErrorRecoveryLayout } from '@/components/error-states/error-recovery-layout';

// UX Plan v2 §7 scenario 6 — adversarial: a supplier farms fake 5-star
// reviews. High severity: trust integrity. The supplier-side message
// they see after Quarantine. (Not the buyer view — buyers never see this
// page; they just don't see the inflated reviews because we've stripped
// them.)

export default function FakeReviewQuarantinePage({
  searchParams,
}: {
  searchParams?: { ref?: string };
}) {
  return (
    <ErrorRecoveryLayout
      scenarioId="fake_review_quarantine"
      severity="high"
      title="نمط مراجعات غير اعتيادي — حسابك قيد المراجعة"
      reassurance="رصد نظامنا نمطاً غير طبيعي في التقييمات الواصلة إلى ملفك (إيقاع، مصدر، أو لغة متشابهة). أوقفنا ظهور تلك التقييمات للزوار مؤقتاً، وفريقنا يراجع الحالة يدوياً خلال ٤٨ ساعة. لو ثبت أنها أصلية ستُسترجَع كلها؛ لو ثبت غير ذلك ستُحذَف ويتواصل معك فريق الالتزام."
      reference={searchParams?.ref ?? null}
      actions={[
        {
          label: 'أرسل توضيحاً أو دليلاً',
          href: 'mailto:trust@elmaared.com',
          emphasis: 'primary',
        },
        {
          label: 'اطّلع على سياسة المراجعات',
          internalHref: '/ar/legal/terms',
        },
      ]}
    />
  );
}
