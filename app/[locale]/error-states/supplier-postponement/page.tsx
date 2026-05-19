import { ErrorRecoveryLayout } from '@/components/error-states/error-recovery-layout';

// UX Plan v2 §7 scenario 10 — supplier hits an emergency (illness,
// accident) and asks for a 7-day postponement. Low severity. Pattern:
// one-click acceptance with an automatic 10% compensation discount;
// no penalty on the supplier if <1 postponement/year.

export default function SupplierPostponementPage({
  searchParams,
}: {
  searchParams?: { rfq?: string };
}) {
  return (
    <ErrorRecoveryLayout
      scenarioId="supplier_postponement"
      severity="low"
      title="المورد يطلب تأجيلاً ٧ أيام"
      reassurance="ظروف طارئة (صحية أو سفر) تحدث. لتيسير الأمر، اعتماد التأجيل بنقرة واحدة يفعّل تلقائياً خصم تعويضي ١٠٪ على إجمالي الصفقة لصالحك، وحساب الأمانة يمتد لنفس المدة. لا غرامة على المورد لو لم يتجاوز التأجيل مرة واحدة في السنة — هذا توازن بين المرونة والالتزام."
      reference={searchParams?.rfq ?? null}
      actions={[
        {
          label: 'اعتمد التأجيل',
          internalHref: '/ar/dashboard/rfqs',
          emphasis: 'primary',
        },
        {
          label: 'تواصل مع المورد',
          internalHref: '/ar/dashboard/rfqs',
        },
      ]}
    />
  );
}
