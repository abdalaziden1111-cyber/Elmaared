import Link from 'next/link';

export default function ForSuppliersPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-4xl font-semibold text-[var(--color-midnight-green)]">
        وصِل لشركات تبحث عنك بالضبط
      </h1>
      <p className="mt-4 text-lg text-[var(--color-stone-600)]">
        طلبات تطابق تخصصك ومدنك تصلك بالبريد + الإشعارات. عمولة 3% فقط، لا رسوم اشتراك.
      </p>

      <ul className="mt-12 grid gap-6 sm:grid-cols-2">
        <Feature title="فقط الطلبات المناسبة" body="نطابق التخصص والمدينة. لا تضييع وقت." />
        <Feature title="ضمان الدفع" body="العميل يدفع للضمان مقدماً. لا قلق من التحصيل." />
        <Feature title="3% فقط" body="نخصمها من قيمة المشروع. لا اشتراك ولا رسوم خفية." />
        <Feature title="ملف عام مجاني" body="معرض أعمالك يُعرض في صفحة Discover للمستخدمين." />
      </ul>

      <div className="mt-12 flex justify-center">
        <Link
          href="/signup/supplier/account"
          className="inline-flex h-12 items-center rounded-xl bg-[var(--color-dune-gold)] px-8 text-sm font-medium text-white"
        >
          سجّل كمورد
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
