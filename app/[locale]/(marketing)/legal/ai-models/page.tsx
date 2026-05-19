import { setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';

// UX Plan v2 Decision #11 (Sprint 1 S1.6) + SDAIA compliance.
// Public AI Model Card listing every AI feature used in the product,
// what it was trained on, the confidence threshold that triggers a
// fallback, and our bias-disclosure stance. The committee (Josh Clark in
// Debate 01, John Maeda in the regulatory matrix) made this non-optional.
// Reviewed every 6 months; lastReviewed below tracks the most recent pass.

export const metadata: Metadata = {
  title: 'بطاقة نماذج Elmaared للذكاء الاصطناعي',
  description:
    'الشفافية الكاملة عن نماذج الذكاء الاصطناعي المُستخدمة في Elmaared — بيانات التدريب، حدود الثقة، خطط الاحتياط، والإفصاح عن الانحياز.',
};

interface ModelCard {
  name: string;
  feature: string;
  model: string;
  trainingData: string;
  confidenceThreshold: string;
  fallback: string;
  biasDisclosure: string;
}

// Mirrors Plan v2 §5 (AI Transparency & Confidence Framework) Model Card
// table. Update this list whenever a new AI surface ships.
const MODELS: ModelCard[] = [
  {
    name: 'عين السوق (Pricing)',
    feature: 'تقدير نطاق السعر العادل لطلب RFQ',
    model: 'RAG على عروض أسعار سابقة (آخر 12 شهراً)',
    trainingData: '500+ عرض موثّق على المنصة 2024–2026',
    confidenceThreshold:
      'دقيق إذا عدد العينات ≥ 10 ومعامل التباين < 25%',
    fallback: '"السوق غير متاح بعد لهذه الفئة" — مع زر تواصل مع المنصة',
    biasDisclosure:
      'يميل النموذج للفئات الأكثر تكراراً (booth, gifts). الفئات الجديدة تُعرض كـ "تخمين أولي" حتى تصل 4 عينات.',
  },
  {
    name: 'AI تحليل العروض',
    feature: 'تقييم كل عرض على 5 محاور وملخّص نقاط القوة والمخاطر',
    model: 'Anthropic Claude Sonnet 4.6',
    trainingData:
      'قواعد B2B السعودية + RLHF داخلي + 200+ عقد مُعتمد سعودي',
    confidenceThreshold: 'دقيق إذا توفّرت 3 عوامل قابلة للمقارنة على الأقل',
    fallback: 'عرض جدول البيانات الخام بدون توصية AI',
    biasDisclosure:
      'النموذج قد يُفضّل العروض ذات الكتابة الاحترافية على الموضوع. نخفّف بإظهار "نقاط القوة" و"المخاطر" منفصلتين بدلاً من نتيجة واحدة.',
  },
  {
    name: 'AI توثيق الاتفاق',
    feature: 'مقارنة فهم العميل والمورد للعقد قبل الإيداع',
    model: 'Claude Sonnet + قوالب قانونية سعودية مُعتمدة',
    trainingData: '200+ عقد سعودي مُعتمد من وزارة العدل',
    confidenceThreshold: 'دقيق إذا كانت بنود الاتفاق قابلة للتحديد بوضوح',
    fallback: 'تمرير العقد لمراجعة محامي بشري — يُعرض زر "اطلب مراجعة"',
    biasDisclosure:
      'تحيّز نحو الصيغ السعودية الرسمية. العقود متعددة الجنسيات قد تحتاج مراجعة بشرية إضافية.',
  },
  {
    name: 'AI Lead Scoring (Day-of)',
    feature: 'تصنيف الزوّار في يوم المعرض كـ Hot / Warm / Cold',
    model: 'تصنيف + استدلال داخلي',
    trainingData: 'سياق الزيارة + بيانات الشركة + مدة التفاعل',
    confidenceThreshold: 'يُعرض "Unscored" badge إذا فشل التصنيف',
    fallback: '"Unscored" badge — يعتمد العارض على ملاحظاته اليدوية',
    biasDisclosure:
      'النموذج يعتمد بشكل كبير على حجم الشركة وسياق الزيارة — قد يُقيّم استارت أبس أقل من قيمتها الحقيقية. مراجعة كل 6 شهور.',
  },
];

const LAST_REVIEWED_HIJRI = '1447/03/15 هـ';
const LAST_REVIEWED_GREGORIAN = '2026/05/19 م';

export default async function AiModelCardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as 'ar' | 'en');

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-4xl font-semibold text-[var(--color-midnight-green)]">
        بطاقة نماذج Elmaared للذكاء الاصطناعي
      </h1>
      <p className="mt-2 text-xs text-[var(--color-stone-600)]">
        آخر مراجعة: <span className="num">{LAST_REVIEWED_HIJRI}</span> ({LAST_REVIEWED_GREGORIAN}).
        المراجعة القادمة: كل 6 أشهر.
      </p>

      <section className="mt-6 rounded-2xl border border-dashed border-[var(--color-action-blue)] bg-[var(--color-info-100)] p-5 text-sm leading-relaxed text-[var(--color-charcoal)]">
        <h2 className="text-base font-semibold text-[var(--color-midnight-green)]">
          لماذا هذه الصفحة موجودة؟
        </h2>
        <p className="mt-2">
          ٤ نماذج ذكاء اصطناعي تعمل خلف Elmaared. كل واحد منها يحمل قيوداً وحدوداً
          للثقة، وقد ينحاز لأنماط بعينها. هنا نُفصح عنها جميعاً — لأن المستخدم
          يستحق أن يعرف على ماذا بُنيت التوصية قبل أن يتخذ قراراً.
        </p>
        <p className="mt-2">
          هذه الصفحة تلتزم بمتطلبات الهيئة السعودية للبيانات والذكاء الاصطناعي (SDAIA)
          للإفصاح العام، وبقرار اللجنة #11 في خطة الـ UX v2.
        </p>
      </section>

      <section className="mt-10 space-y-6">
        {MODELS.map((m) => (
          <article
            key={m.name}
            className="rounded-2xl border border-[var(--color-stone-300)] bg-white p-6"
            data-component="ai-model-card"
          >
            <header className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-semibold text-[var(--color-midnight-green)]">
                {m.name}
              </h2>
              <span className="rounded-full bg-[var(--color-cream)] px-3 py-1 text-xs font-medium text-[var(--color-stone-600)]">
                {m.model}
              </span>
            </header>
            <p className="mt-1 text-sm text-[var(--color-charcoal)]">{m.feature}</p>

            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <Row label="بيانات التدريب" value={m.trainingData} />
              <Row label="حد الثقة" value={m.confidenceThreshold} />
              <Row label="السلوك عند الفشل" value={m.fallback} />
              <Row label="الإفصاح عن الانحياز" value={m.biasDisclosure} highlight />
            </dl>
          </article>
        ))}
      </section>

      <section className="mt-10 rounded-2xl border border-[var(--color-stone-300)] bg-[var(--color-cream)] p-5 text-sm">
        <h2 className="text-base font-semibold text-[var(--color-midnight-green)]">
          هل تجد ناتجاً منحازاً أو غير دقيق؟
        </h2>
        <p className="mt-2 leading-relaxed text-[var(--color-charcoal)]">
          استخدم زر <strong>"أنا لا أوافق"</strong> الموجود بجانب كل تقييم AI في
          صفحة مقارنة العروض. الملاحظات تُغذّي إعادة تدريب النماذج كل ربع سنوي،
          وكل تعليق يُراجَع بشرياً.
        </p>
        <p className="mt-3 leading-relaxed text-[var(--color-stone-600)]">
          للاستفسارات القانونية أو الإعلامية حول النماذج، راسلنا على{' '}
          <a
            className="text-[var(--color-action-blue)] hover:underline"
            href="mailto:ai-models@elmaared.com"
          >
            ai-models@elmaared.com
          </a>
          .
        </p>
      </section>
    </main>
  );
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        'rounded-xl p-3 ' +
        (highlight
          ? 'bg-[var(--color-warning-100)] text-[var(--color-warning)]'
          : 'bg-[var(--color-cream)] text-[var(--color-charcoal)]')
      }
    >
      <dt className="text-xs font-semibold opacity-80">{label}</dt>
      <dd className="mt-1 text-sm leading-relaxed">{value}</dd>
    </div>
  );
}
