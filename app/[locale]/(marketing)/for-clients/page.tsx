import Link from 'next/link';

export default function ForClientsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-4xl font-semibold text-[var(--color-midnight-green)]">
        منصة واحدة لكل احتياجات معارضك
      </h1>
      <p className="mt-4 text-lg text-[var(--color-stone-600)]">
        أنشئ طلباً واحداً، استقبل عروضاً من موردين معتمدين، قارن بمساعدة الذكاء الاصطناعي،
        وحفظ نقودك في الضمان حتى يتم التسليم.
      </p>

      <ul className="mt-12 grid gap-6 sm:grid-cols-2">
        <Feature title="عمولة 5% فقط" body="2% منك و3% من المورد. لا رسوم اشتراك ولا رسوم خفية." />
        <Feature title="ضمان كامل" body="نقودك في حساب الضمان حتى تستلم وتعتمد التسليم." />
        <Feature title="موردون معتمدون" body="كل مورد يمر بمراجعة قبل ظهوره. سجل تجاري + تقييمات." />
        <Feature title="تقييم AI لكل عرض" body="نقاط القوة والمخاطر بالعربية في أقل من دقيقة." />
      </ul>

      <div className="mt-12 flex justify-center">
        <Link
          href="/signup/client/account"
          className="inline-flex h-12 items-center rounded-xl bg-[var(--color-action-blue)] px-8 text-sm font-medium text-[var(--color-cream)]"
        >
          ابدأ الآن — مجاناً
        </Link>
      </div>
    </main>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <li className="rounded-2xl border border-[var(--color-stone-300)] bg-white p-5">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-[var(--color-stone-600)]">{body}</p>
    </li>
  );
}
