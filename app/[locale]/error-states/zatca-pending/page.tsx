import { ErrorRecoveryLayout } from '@/components/error-states/error-recovery-layout';

// UX Plan v2 §7 scenario 3 — ZATCA API timeout. Receipt has been issued
// provisionally; the e-invoice will arrive once ZATCA responds. Medium
// severity — payment already cleared; the regulatory artifact is in
// flight.

export default function ZatcaPendingPage({
  searchParams,
}: {
  searchParams?: { ref?: string };
}) {
  return (
    <ErrorRecoveryLayout
      scenarioId="zatca_pending"
      severity="medium"
      title="فاتورتك ZATCA في الطريق"
      reassurance="دفعتك تمّت بنجاح، وأصدرنا الإيصال الأولي فوراً. خدمة ZATCA الإلكترونية تأخّرت قليلاً، لذا الفاتورة الرسمية مع رمز QR ستصلك على البريد خلال ٦ ساعات كحد أقصى. نحاول تلقائياً كل ١٥ دقيقة، ولو لم تصل خلال ٦ ساعات سيتدخل فريقنا يدوياً."
      reference={searchParams?.ref ?? null}
      actions={[
        {
          label: 'حمّل الإيصال الأولي',
          internalHref: '/ar/dashboard/rfqs',
          emphasis: 'primary',
        },
        {
          label: 'تواصل لو طال الانتظار',
          href: 'https://wa.me/966500000000',
        },
      ]}
    />
  );
}
