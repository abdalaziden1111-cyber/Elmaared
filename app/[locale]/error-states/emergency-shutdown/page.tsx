import { ErrorRecoveryLayout } from '@/components/error-states/error-recovery-layout';

// UX Plan v2 §7 scenario 9 — CATASTROPHIC: SAMA or CITC orders a
// temporary platform shutdown. Critical severity. Pattern: explain
// Read-only mode, point at Segregated Accounts that protect funds,
// explain how active escrow deals will still complete via Bank-direct.

export default function EmergencyShutdownPage() {
  return (
    <ErrorRecoveryLayout
      scenarioId="emergency_shutdown"
      severity="critical"
      title="المنصة في وضع القراءة فقط مؤقتاً"
      reassurance="بسبب تعليمات تنظيمية، أوقفنا مؤقتاً إنشاء أي طلب أو دفعة جديدة. الأموال في حسابات الأمانة محفوظة في حسابات بنكية مستقلة (Segregated Accounts) ولا تتأثر بحالة المنصة. الصفقات الجارية ستُستكمَل من خلال شراكة بنكية مباشرة، وفريقنا يتواصل مع كل طرف على حدة. سنُحدِّث الحالة هنا فور رفع التعليق."
      actions={[
        {
          label: 'تواصل لتفاصيل صفقتك',
          href: 'https://wa.me/966500000000',
          emphasis: 'primary',
        },
        {
          label: 'صفحة الحالة',
          href: 'https://status.elmaared.com',
        },
      ]}
    />
  );
}
