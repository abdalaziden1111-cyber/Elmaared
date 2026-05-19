import { ErrorRecoveryLayout } from '@/components/error-states/error-recovery-layout';

// UX Plan v2 §7 scenario 11 — push notification went unread for 48h.
// Low severity. Pattern: explain the cascade Push → SMS → WhatsApp →
// Email → Phone, so the user understands the system is patient and
// won't drop them on the floor.

export default function NotificationUnreadPage() {
  return (
    <ErrorRecoveryLayout
      scenarioId="notification_unread"
      severity="low"
      title="إشعاراتك لم تصل — جربنا قنوات بديلة"
      reassurance="عند عدم فتح إشعار مهم، نتسلسل تلقائياً: ٢ ساعة بعد ذلك → SMS، ٦ ساعات → WhatsApp، ٢٤ ساعة → Email، ٤٨ ساعة → اتصال من Customer Success. هدفنا ألّا تفوّت لحظة حاسمة في صفقة أو معرض."
      actions={[
        {
          label: 'اطّلع على الإشعارات',
          internalHref: '/ar/dashboard/notifications',
          emphasis: 'primary',
        },
        {
          label: 'حدّث تفضيلات التنبيه',
          internalHref: '/ar/dashboard/settings/profile',
        },
      ]}
    />
  );
}
