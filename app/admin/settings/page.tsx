import { FEES } from '@/lib/constants/fees';
import { SERVICE_TYPES } from '@/lib/constants/service-types';
import { CITIES } from '@/lib/constants/cities';

// Per the doc spec, this page surfaces commission rates / email templates /
// service types. The MVP doesn't have a settings table yet — values are
// constants in code. This view exposes them read-only so admins can verify
// what's live without crawling source. Editing UI ships in Phase 2 with
// a settings table + RBAC.

const NOTIFICATION_KINDS: Array<{ kind: string; label: string }> = [
  { kind: 'rfq_match', label: 'تطابق طلب جديد لمورد' },
  { kind: 'proposal_received', label: 'وصول عرض جديد للعميل' },
  { kind: 'proposal_shortlisted', label: 'ترشيح عرض' },
  { kind: 'proposal_accepted', label: 'قبول عرض' },
  { kind: 'proposal_rejected', label: 'رفض عرض' },
  { kind: 'agreement_pending', label: 'اتفاقية بانتظار التوقيع' },
  { kind: 'escrow_deposit_required', label: 'إيداع مطلوب من العميل' },
  { kind: 'escrow_received', label: 'تم استلام الإيداع' },
  { kind: 'work_started', label: 'بدء التنفيذ' },
  { kind: 'delivery_pending', label: 'تسليم بانتظار الاعتماد' },
  { kind: 'delivery_approved', label: 'اعتماد التسليم' },
  { kind: 'panic_button', label: '🚨 تصعيد عاجل' },
  { kind: 'message', label: 'رسالة محادثة جديدة' },
  { kind: 'system', label: 'إشعار نظام' },
];

function pct(rate: number): string {
  return `${(rate * 100).toLocaleString('en', { maximumFractionDigits: 2 })}%`;
}

export default function AdminSettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-[var(--color-midnight-green)]">
        إعدادات المنصة
      </h1>
      <p className="mt-1 text-sm text-[var(--color-stone-600)]">
        القيم الفاعلة حالياً على المنصة (للعرض فقط في هذا الإصدار). التحرير يأتي مع
        طبقة الصلاحيات في إصدار قادم.
      </p>

      {/* Commission rates */}
      <section className="mt-6 rounded-2xl border border-[var(--color-stone-300)] bg-white p-5">
        <h2 className="text-base font-semibold text-[var(--color-midnight-green)]">
          العمولات والضرائب
        </h2>
        <p className="mt-1 text-xs text-[var(--color-stone-600)]">
          تُطبَّق على كل صفقة ضمان. القيم محسوبة في{' '}
          <span className="num">lib/constants/fees.ts</span> و{' '}
          <span className="num">lib/utils/escrow-calculator.ts</span>.
        </p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Row label="رسوم العميل" value={pct(FEES.CLIENT_RATE)} mono />
          <Row label="رسوم المورد" value={pct(FEES.SUPPLIER_RATE)} mono />
          <Row label="إجمالي عمولة المنصة" value={pct(FEES.TOTAL_RATE)} mono />
          <Row label="ضريبة القيمة المضافة" value={pct(FEES.VAT_RATE)} mono />
        </dl>
        <div className="mt-4 rounded-xl bg-[var(--color-cream)] p-3 text-xs text-[var(--color-stone-600)]">
          <p>
            <span className="font-medium">مثال:</span> صفقة بقيمة 100,000 ﷼ →
            رسوم عميل 2,000 + ضريبتها 300 ⇒ المبلغ المسحوب من العميل
            <span className="num font-medium"> 102,300 ﷼</span>؛
            رسوم مورد 3,000 + ضريبتها 450 ⇒ صافي للمورد
            <span className="num font-medium"> 96,550 ﷼</span>؛
            إيراد المنصة <span className="num font-medium">5,000 ﷼</span> + ضريبة محصّلة
            <span className="num font-medium"> 750 ﷼</span>.
          </p>
        </div>
      </section>

      {/* Escrow mode */}
      <section className="mt-4 rounded-2xl border border-[var(--color-stone-300)] bg-white p-5">
        <h2 className="text-base font-semibold text-[var(--color-midnight-green)]">
          نمط الضمان (Escrow Mode)
        </h2>
        <p className="mt-2 text-sm">
          <span className="rounded-full bg-[var(--color-action-blue)]/10 px-3 py-1 text-xs text-[var(--color-action-blue)]">
            evidence-only
          </span>
          <span className="ms-3 text-[var(--color-stone-600)]">
            العميل يحوّل المبلغ مباشرةً للمورد ويرفع الإيصال. المنصة لا تمسك الأموال.
          </span>
        </p>
        <p className="mt-3 text-xs text-[var(--color-stone-600)]">
          مرجع التطبيق: مهاجرة{' '}
          <span className="num">supabase/migrations/20260510000001_evidence_only_mode.sql</span>.
        </p>
      </section>

      {/* Service types */}
      <section className="mt-4 rounded-2xl border border-[var(--color-stone-300)] bg-white p-5">
        <h2 className="text-base font-semibold text-[var(--color-midnight-green)]">
          أنواع الخدمات
        </h2>
        <p className="mt-1 text-xs text-[var(--color-stone-600)]">
          الفئات التي يمكن للعميل اختيارها عند إنشاء طلب RFQ. مصدر:{' '}
          <span className="num">lib/constants/service-types.ts</span>.
        </p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {SERVICE_TYPES.map((s) => (
            <li
              key={s.value}
              className="flex items-center justify-between rounded-xl border border-[var(--color-stone-300)] p-3 text-sm"
            >
              <div>
                <div className="font-medium">{s.labelAr}</div>
                <div className="mt-0.5 text-xs text-[var(--color-stone-600)]">
                  {s.labelEn}
                </div>
              </div>
              <span className="num text-xs text-[var(--color-stone-600)]">
                {s.value}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Cities */}
      <section className="mt-4 rounded-2xl border border-[var(--color-stone-300)] bg-white p-5">
        <h2 className="text-base font-semibold text-[var(--color-midnight-green)]">
          المدن المدعومة
        </h2>
        <p className="mt-1 text-xs text-[var(--color-stone-600)]">
          مصدر: <span className="num">lib/constants/cities.ts</span>.
        </p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {CITIES.map((c) => (
            <li
              key={c.value}
              className="rounded-full bg-[var(--color-stone-100)] px-3 py-1 text-xs"
            >
              <span className="font-medium">{c.labelAr}</span>
              <span className="ms-2 text-[var(--color-stone-600)]">{c.value}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Email & in-app notification kinds */}
      <section className="mt-4 rounded-2xl border border-[var(--color-stone-300)] bg-white p-5">
        <h2 className="text-base font-semibold text-[var(--color-midnight-green)]">
          أنواع الإشعارات + قوالب الإيميل
        </h2>
        <p className="mt-1 text-xs text-[var(--color-stone-600)]">
          القوالب تُولَّد ديناميكياً. مصدر بنية الإشعار:{' '}
          <span className="num">lib/notifications/build.ts</span>؛ قالب RFQ-match
          الكامل في <span className="num">lib/email/templates.ts</span>.
        </p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {NOTIFICATION_KINDS.map((n) => (
            <li
              key={n.kind}
              className="flex items-center justify-between rounded-xl border border-[var(--color-stone-300)] p-3 text-sm"
            >
              <span>{n.label}</span>
              <span className="num text-xs text-[var(--color-stone-600)]">
                {n.kind}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Footer note */}
      <div className="mt-6 rounded-2xl border border-[var(--color-stone-300)] bg-[var(--color-cream)] p-5 text-xs text-[var(--color-stone-600)]">
        <p>
          <span className="font-medium">للتعديل:</span> القيم في الكود الآن — لتعديلها
          عدّل الملفات المشار إليها أعلاه ثم أعد النشر. واجهة التحرير من Admin
          تتطلّب جدول <span className="num">platform_settings</span> + RBAC وستضاف
          في إصدار قادم.
        </p>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl bg-[var(--color-cream)] p-3">
      <dt className="text-xs text-[var(--color-stone-600)]">{label}</dt>
      <dd className={`mt-1 text-base font-semibold ${mono ? 'num' : ''}`}>{value}</dd>
    </div>
  );
}
