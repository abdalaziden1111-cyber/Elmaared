// Placeholder MVP blog articles. Real CMS integration can replace this with
// a Supabase fetch or MDX directory loader. Each article has parallel ar/en
// fields and a short reading time.

export type BlogArticle = {
  slug: string;
  titleAr: string;
  titleEn: string;
  excerptAr: string;
  excerptEn: string;
  bodyAr: string[];
  bodyEn: string[];
  minutes: number;
  date: string;
};

export const BLOG_ARTICLES: BlogArticle[] = [
  {
    slug: 'how-to-pick-a-booth-contractor',
    titleAr: 'كيف تختار مورد جناح بدون أن تضيع وقتك',
    titleEn: 'How to pick a booth contractor without wasting your time',
    excerptAr: '5 أسئلة تطرحها على كل مورد قبل التوقيع.',
    excerptEn: '5 questions every booth contractor must answer before you sign.',
    bodyAr: [
      'اختيار مورد الجناح المناسب هو أهم قرار قبل أيّ معرض كبير. الفرق بين اختيار جيد وآخر سيّئ قد يعني فرق 30% في التكلفة و50% في الجودة.',
      'في هذا المقال نستعرض 5 أسئلة عملية تساعدك على تصفية الخيارات بسرعة.',
      'السؤال الأول: هل لديهم سابقة أعمال في نفس نوع الجناح وفي مدينة المعرض؟ كثير من الموردين يجيدون التصميم لكن تنفيذ جناح حديدي بمواصفات السلامة في حدث كبير يتطلّب خبرة محدّدة.',
      'السؤال الثاني: ما هي شروط الدفع؟ مورد محترف لن يطلب أكثر من 50% مقدماً.',
      'السؤال الثالث: مَن مسؤول التواصل خلال فترة التنفيذ؟ اطلب اسم شخص بعينه وقناة تواصل مباشرة.',
    ],
    bodyEn: [
      'Picking the right booth contractor is the single biggest decision before any major exhibition. The gap between a good pick and a bad one can mean 30% in cost and 50% in quality.',
      'In this article we go through 5 practical questions that help you filter quickly.',
      'Question 1: do they have a track record in the same booth type and exhibition city? Many suppliers do design well — but executing a steel‑frame booth meeting safety codes at a large event takes very specific experience.',
      'Question 2: what are the payment terms? A pro contractor will not ask more than 50% upfront.',
      'Question 3: who is your point of contact during execution? Demand a specific name and direct channel.',
    ],
    minutes: 5,
    date: '2026-04-12',
  },
  {
    slug: 'escrow-vs-direct-payment',
    titleAr: 'الضمان النقدي مقابل الدفع المباشر — أيهما أكثر أماناً؟',
    titleEn: 'Escrow vs direct payment — which is safer?',
    excerptAr: 'تحليل مالي بسيط لمن يجد نفسه أمام خيارَيْن.',
    excerptEn: 'A simple financial analysis for anyone facing the two options.',
    bodyAr: [
      'الدفع المباشر مغرٍ لأنه أسرع. لكن في الفعاليات والمعارض، التأخير في التسليم أو نقص الجودة قد يكلّفك أضعاف ما وفّرته في وقت التحويل.',
      'الضمان النقدي يحمي الطرفين: العميل لا يخاطر بأمواله قبل التسليم، والمورد مضمون له الدفع عند الإنجاز.',
      'في تطبيق المعارض، 50% أوّليّة بعد توقيع الاتفاقية، والـ50% المتبقية بعد اعتماد التسليم. Admin يؤكد كل خطوة.',
    ],
    bodyEn: [
      'Direct payment is tempting because it is fast. But in events and exhibitions, late delivery or quality shortfalls can cost you multiples of what you saved in transfer time.',
      'Cash escrow protects both sides: the client does not risk funds before delivery, and the supplier is guaranteed payment on completion.',
      'On App Exhibition, 50% is paid initially after agreement, and the remaining 50% after delivery is accepted. Admin confirms each step.',
    ],
    minutes: 4,
    date: '2026-03-22',
  },
  {
    slug: 'ai-evaluation-criteria',
    titleAr: 'كيف يقيّم الذكاء الاصطناعي عروض الموردين؟',
    titleEn: 'How AI scores supplier offers',
    excerptAr: '5 محاور موضوعية يقيس عليها التطبيق كل عرض.',
    excerptEn: '5 objective axes the platform uses to score every offer.',
    bodyAr: [
      'كل عرض يصل لطلبك يمر بنموذج تقييم يلخّص لك ما يهمّك في أقل من دقيقة. النموذج لا يستبدل قرارك — يساعدك على المقارنة بسرعة.',
      'المحاور: السعر مقابل الميزانية، مدة التسليم، شمولية العرض (هل غطّى كل ما طلبته؟)، احترافية الكتابة والملحقات، السجل التاريخي للمورد على المنصة.',
      'النتيجة: نقاط من 100 + ملخّص مكتوب لنقاط القوة والمخاطر بالعربية.',
    ],
    bodyEn: [
      'Every offer to your RFQ runs through a scoring model that surfaces what matters in under a minute. The model does not replace your decision — it helps you compare fast.',
      'Axes: price vs budget, delivery timeline, scope coverage (did they address every point you asked for?), professionalism of writing and attachments, supplier track record on the platform.',
      'Output: a score out of 100 plus a written summary of strengths and risks in Arabic.',
    ],
    minutes: 6,
    date: '2026-03-05',
  },
  {
    slug: 'panic-button-when-to-use',
    titleAr: 'متى تضغط زر الطوارئ؟',
    titleEn: 'When to hit the panic button',
    excerptAr: '4 مواقف تستحق التصعيد، و3 مواقف لا.',
    excerptEn: '4 situations that deserve escalation, and 3 that don\'t.',
    bodyAr: [
      'زر الطوارئ في المحادثة يصعّد القضية لفريق المنصة خلال 30 دقيقة. استخدمه بحكمة.',
      'مواقف تستحق التصعيد: المورد توقّف عن الرد >24 ساعة بدون سبب، اكتشاف معلومات مضلّلة في العرض، خلاف حادّ على تفسير الاتفاقية، طلب رشوة أو خروج عن المنصة.',
      'مواقف لا تحتاج للتصعيد: تأخّر بسيط في الرد، خلاف بسيط على لون أو خامة (هذا يحلّ بالحوار)، استفسار عام (للأمر استخدم زر السؤال العادي).',
    ],
    bodyEn: [
      'The panic button in chat escalates the issue to the ops team within 30 minutes. Use it judiciously.',
      'Worth escalating: supplier silent >24 hours with no reason, misleading information in the offer, sharp disagreement on contract interpretation, off‑platform bribe / payment request.',
      'Not worth escalating: minor delay in response, small disagreement on color or material (resolve by chat), general question (use the regular question button).',
    ],
    minutes: 3,
    date: '2026-02-18',
  },
  {
    slug: 'planning-your-first-leap',
    titleAr: 'دليل سريع لتجهيز معرض LEAP',
    titleEn: 'A fast guide to preparing for LEAP',
    excerptAr: 'جدول 8 أسابيع، من الفكرة لليوم الأول من المعرض.',
    excerptEn: '8‑week schedule, from concept to opening day.',
    bodyAr: [
      'LEAP يحضره عشرات الآلاف. تجهيزك يبدأ قبل 8 أسابيع على الأقل.',
      'الأسبوع 8–6: اطلب تصاميم جناح. الأسبوع 6–4: اختر مورد، وقّع، أودع.',
      'الأسبوع 4–2: تنفيذ، مراجعة عيّنات، تحديث الشعارات. الأسبوع 2–0: تركيب، اختبار، اللمسات الأخيرة.',
      'احرص على وجود خطة بديلة لأي مكوّن حيوي (شاشة، إضاءة، صوت).',
    ],
    bodyEn: [
      'LEAP draws tens of thousands. Your preparation starts at least 8 weeks ahead.',
      'Week 8–6: request booth designs. Week 6–4: pick a supplier, sign, deposit.',
      'Week 4–2: execute, review samples, finalize logos. Week 2–0: install, test, polish.',
      'Always plan a backup for any critical component (screen, lighting, sound).',
    ],
    minutes: 5,
    date: '2026-01-30',
  },
];

export function getArticle(slug: string): BlogArticle | undefined {
  return BLOG_ARTICLES.find((a) => a.slug === slug);
}
