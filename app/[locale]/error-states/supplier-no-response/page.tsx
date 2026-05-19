import { ErrorRecoveryLayout } from '@/components/error-states/error-recovery-layout';

// UX Plan v2 §7 scenario 4 — supplier silent 48h before the event date.
// Critical: there's a hard deadline. Pattern: invoke zر الفزعة + backup
// supplier network; reassure that Elmaared will eat the gap if needed.

export default function SupplierNoResponsePage({
  searchParams,
}: {
  searchParams?: { ref?: string };
}) {
  return (
    <ErrorRecoveryLayout
      scenarioId="supplier_no_response"
      severity="critical"
      title="لم يردّ المورد — ضغطنا زر الفزعة"
      reassurance="فريق Customer Success تواصل مع المورد للحظة وسيتدخل خلال ١٥ دقيقة كحد أقصى. لو لم يستجب، عندنا شبكة احتياطية من الموردين الجاهزين تغطي الفجوة قبل المعرض، وأي فرق في التكلفة تدفعه Elmaared لو اقتضى الأمر. هدفنا الوحيد: ينطلق معرضك في موعده."
      reference={searchParams?.ref ?? null}
      actions={[
        {
          label: 'افتح المحادثة',
          internalHref: '/ar/dashboard/rfqs',
          emphasis: 'primary',
        },
        {
          label: 'كلّم Customer Success مباشرة',
          href: 'https://wa.me/966500000000',
        },
      ]}
    />
  );
}
