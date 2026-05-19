import { ErrorRecoveryLayout } from '@/components/error-states/error-recovery-layout';
import { trustName } from '@/lib/i18n/trust-name';

// UX Plan v2 §7 scenario 1 — Escrow Transfer fails midway. Critical: money
// is involved. Pattern: explicitly reassure that funds are safe, name the
// failing third party (the bank), give a fast retry + a human channel.

export default function EscrowTransferFailedPage({
  searchParams,
}: {
  searchParams?: { ref?: string };
}) {
  return (
    <ErrorRecoveryLayout
      scenarioId="escrow_transfer_failed"
      severity="critical"
      title={`${trustName('ar')} محفوظة — لكن البنك لم يستجب`}
      reassurance="حوالتك لم تنفذ بسبب توقف مؤقت في API البنك. مالك لم يخرج من حسابك بعد، وعند نجاح المحاولة التالية ستذهب مباشرة إلى الأمانة المحايدة كالمعتاد. هذه مشكلة من جانب البنك، ليست من Elmaared."
      reference={searchParams?.ref ?? null}
      actions={[
        {
          label: 'إعادة المحاولة',
          internalHref: '/ar/dashboard/rfqs',
          testId: 'recovery-retry',
          emphasis: 'primary',
        },
        {
          label: 'تواصل عبر WhatsApp',
          href: 'https://wa.me/966500000000',
          testId: 'recovery-whatsapp',
        },
      ]}
    />
  );
}
