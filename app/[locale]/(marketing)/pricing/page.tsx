export default function PricingPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-4xl font-semibold text-[var(--color-midnight-green)]">
        تسعير بسيط وشفاف
      </h1>
      <p className="mt-4 text-lg text-[var(--color-stone-600)]">
        لا اشتراكات. عمولة واحدة فقط على المشاريع التي تتمّ بنجاح عبر المنصة.
      </p>

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        <Card title="للعملاء" rate="2%" body="من قيمة المشروع، تُضاف وقت الإيداع المبدئي." />
        <Card title="للموردين" rate="3%" body="من قيمة المشروع، تُخصم من الدفعة النهائية." />
      </div>

      <p className="mt-10 rounded-xl bg-white p-5 text-sm">
        إجمالي عمولة المنصة <strong>5%</strong>. ضريبة القيمة المضافة 15% تُحتسب على
        العمولة فقط (لا على قيمة المشروع نفسها).
      </p>
    </main>
  );
}

function Card({ title, rate, body }: { title: string; rate: string; body: string }) {
  return (
    <div className="rounded-2xl border border-[var(--color-stone-300)] bg-white p-6">
      <h2 className="text-sm font-medium text-[var(--color-stone-600)]">{title}</h2>
      <div className="mt-2 text-4xl font-semibold text-[var(--color-midnight-green)] num">
        {rate}
      </div>
      <p className="mt-1 text-sm text-[var(--color-stone-600)]">{body}</p>
    </div>
  );
}
