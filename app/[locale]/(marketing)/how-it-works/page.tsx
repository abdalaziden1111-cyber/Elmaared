export default function HowItWorksPage() {
  const steps = [
    { n: 1, title: 'سجّل وصِف ما تحتاج', body: 'دقيقتان لإنشاء حساب وكتابة طلبك. اختر الخدمة والمدينة والميزانية.' },
    { n: 2, title: 'استقبل عروض الموردين', body: 'الموردون المطابقون يتلقون إشعاراً ويقدّمون عروضهم بأسعارهم وشروطهم.' },
    { n: 3, title: 'قارن بمساعدة AI', body: 'نقيّم كل عرض على 5 محاور: السعر، التسليم، الشمولية، الاحترافية، السجل.' },
    { n: 4, title: 'تفاوض في محادثة آمنة', body: 'محادثات داخل المنصة. زر تصعيد لـ Admin متاح في أي وقت.' },
    { n: 5, title: 'وقّع الاتفاق', body: 'كل طرف يكتب فهمه. AI يحلّل الفروق ويقترح. توقيع رقمي للطرفين.' },
    { n: 6, title: 'أودع للضمان', body: 'حوّل 50% للضمان. Admin يؤكد. الإصدار النهائي بعد التسليم والاعتماد.' },
  ];
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-4xl font-semibold text-[var(--color-midnight-green)]">
        كيف يعمل تطبيق المعارض
      </h1>
      <ol className="mt-10 grid gap-6">
        {steps.map((s) => (
          <li key={s.n} className="flex gap-4 rounded-2xl border border-[var(--color-stone-300)] bg-white p-5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-midnight-green)] text-sm font-semibold text-[var(--color-cream)]">
              {s.n}
            </span>
            <div>
              <h2 className="text-base font-semibold">{s.title}</h2>
              <p className="mt-1 text-sm text-[var(--color-stone-600)]">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </main>
  );
}
