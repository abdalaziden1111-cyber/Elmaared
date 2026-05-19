import { ErrorRecoveryLayout } from '@/components/error-states/error-recovery-layout';

// UX Plan v2 §7 scenario 12 — buyer forgets the password on the morning
// of the exhibition. Low severity (relative to the others), but high
// urgency for the user. Pattern: Magic link via WhatsApp in 15s; Nafath
// re-auth as fallback; Customer Success temp token last resort.

export default function PasswordForgottenPage() {
  return (
    <ErrorRecoveryLayout
      scenarioId="password_forgotten"
      severity="low"
      title="نسيت كلمة المرور؟ ثلاث طرق سريعة"
      reassurance="ستتلقى رابطاً سحرياً عبر WhatsApp خلال ١٥ ثانية. لو لم يصل، استخدم نفاذ لإعادة الدخول بنقرة. لو فشل الاثنان، Customer Success يصدر لك رمزاً مؤقتاً عبر SMS. لن نتركك خارج المنصة في يوم معرضك."
      actions={[
        {
          label: 'أرسل لي رابط WhatsApp',
          internalHref: '/ar/reset-password',
          emphasis: 'primary',
        },
        {
          label: 'دخول بـ نفاذ',
          internalHref: '/ar/login',
        },
        {
          label: 'اتصل بـ Customer Success',
          href: 'https://wa.me/966500000000',
        },
      ]}
    />
  );
}
