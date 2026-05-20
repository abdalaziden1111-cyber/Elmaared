#!/usr/bin/env node
// Phase V5.1 — Migrate the 5 hardcoded blog articles in
// app/[locale]/(marketing)/blog/articles.ts into the new blog_posts table.
// Idempotent: upserts on slug.
//
// Run:  pnpm exec node scripts/seed-blog.mjs

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const envText = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
const env = Object.fromEntries(
  envText
    .split('\n')
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      const k = l.slice(0, i).trim();
      let v = l.slice(i + 1).trim();
      if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
      return [k, v];
    })
);

const sb = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Inline-import the articles module. It's an ESM .ts; we can't import it
// directly from .mjs, so we recreate the data here. Keep this in sync with
// app/[locale]/(marketing)/blog/articles.ts until that file is deleted.
const ARTICLES = [
  {
    slug: 'how-to-pick-a-booth-contractor',
    titleAr: 'كيف تختار مورد جناح بدون أن تضيع وقتك',
    titleEn: 'How to pick a booth contractor without wasting your time',
    excerptAr: '5 أسئلة تطرحها على كل مورد قبل التوقيع.',
    excerptEn: '5 questions every booth contractor must answer before you sign.',
    bodyAr: [
      'اختيار مورد الجناح المناسب هو أهم قرار قبل أيّ معرض كبير. الفرق بين اختيار جيد وآخر سيّئ قد يعني فرق 30% في التكلفة و50% في الجودة.',
      'في هذا المقال نستعرض 5 أسئلة عملية تساعدك على تصفية الخيارات بسرعة.',
      'السؤال الأول: هل لديهم سابقة أعمال في نفس نوع الجناح وفي مدينة المعرض؟',
      'السؤال الثاني: ما هي شروط الدفع؟ مورد محترف لن يطلب أكثر من 50% مقدماً.',
      'السؤال الثالث: مَن مسؤول التواصل خلال فترة التنفيذ؟',
    ],
    bodyEn: [
      'Picking the right booth contractor is the single biggest decision before any major exhibition.',
      '5 practical questions to filter quickly.',
      '1. Do they have a track record in the same booth type + city?',
      '2. What are their payment terms? A pro will not ask more than 50% upfront.',
      '3. Who is your point of contact during execution?',
    ],
    minutes: 5,
    date: '2026-04-12',
    tags: ['booths', 'how-to'],
  },
  {
    slug: 'escrow-vs-direct-payment',
    titleAr: 'لماذا الإسكرو؟ وهل يستحق؟',
    titleEn: 'Why escrow? And is it worth it?',
    excerptAr: 'حماية مالية بسيطة لطرفي العقد.',
    excerptEn: 'Simple financial protection for both parties.',
    bodyAr: [
      'الإسكرو يحمي مالك حتى الاستلام الفعلي للعمل.',
      'منصة Elmaared تستخدم نظام الأمانة Elmaared™ لضمان الأطراف.',
    ],
    bodyEn: [
      'Escrow protects your money until the work is actually delivered.',
      'Elmaared platform uses Amanah Elmaared™ to safeguard both parties.',
    ],
    minutes: 3,
    date: '2026-04-08',
    tags: ['payments', 'trust'],
  },
  {
    slug: 'ai-evaluation-criteria',
    titleAr: 'كيف يقيّم الذكاء الاصطناعي العروض؟',
    titleEn: 'How does AI evaluate proposals?',
    excerptAr: 'شفافية كاملة في معايير التقييم.',
    excerptEn: 'Full transparency on evaluation criteria.',
    bodyAr: [
      'الذكاء الاصطناعي يقيّم العروض على 5 محاور: السعر، التسليم، الاكتمال، الاحترافية، سجل المورد.',
    ],
    bodyEn: [
      'AI evaluates proposals on 5 dimensions: price, delivery, completeness, professionalism, supplier track record.',
    ],
    minutes: 4,
    date: '2026-04-01',
    tags: ['ai', 'how-to'],
  },
  {
    slug: 'panic-button-when-to-use',
    titleAr: 'متى تستخدم زر التصعيد؟',
    titleEn: 'When to use the panic button',
    excerptAr: 'دليل سريع لمتى يدخل Admin كطرف ثالث.',
    excerptEn: 'Quick guide on when Admin steps in as a third party.',
    bodyAr: [
      'زر التصعيد متاح في كل محادثة لتنبيه الإدارة عند أي إشكال جدي.',
    ],
    bodyEn: [
      'The panic button is available in every chat to alert Admin when a serious issue arises.',
    ],
    minutes: 2,
    date: '2026-03-25',
    tags: ['trust', 'help'],
  },
  {
    slug: 'planning-your-first-leap',
    titleAr: 'تخطيط أول مشاركة في معرض LEAP',
    titleEn: 'Planning your first LEAP exhibition',
    excerptAr: 'خطة عمل من 8 أسابيع.',
    excerptEn: 'An 8-week game plan.',
    bodyAr: [
      'المشاركة في LEAP تحتاج تخطيط 8 أسابيع على الأقل.',
      'ابدأ بحجز المساحة، ثم اطلب عروض الموردين عبر Elmaared.',
    ],
    bodyEn: [
      'Participating in LEAP needs at least 8 weeks of planning.',
      'Start with booth space booking, then request supplier proposals via Elmaared.',
    ],
    minutes: 6,
    date: '2026-03-15',
    tags: ['events', 'how-to'],
  },
];

function htmlFromParas(paras) {
  return paras.map((p) => `<p>${p.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`).join('\n');
}

console.log(`[seed-blog] inserting ${ARTICLES.length} articles…`);

let success = 0;
for (const a of ARTICLES) {
  const wordCountAr = a.bodyAr.join(' ').split(/\s+/).length;
  const readingTime = Math.max(1, Math.ceil(wordCountAr / 200));
  const { error } = await sb.from('blog_posts').upsert(
    {
      slug: a.slug,
      title_ar: a.titleAr,
      title_en: a.titleEn,
      excerpt_ar: a.excerptAr,
      excerpt_en: a.excerptEn,
      content_ar: htmlFromParas(a.bodyAr),
      content_en: htmlFromParas(a.bodyEn),
      tags: a.tags,
      reading_time_minutes: readingTime,
      status: 'published',
      published_at: new Date(a.date).toISOString(),
    },
    { onConflict: 'slug' }
  );
  if (error) {
    console.error(`[seed-blog] ${a.slug} failed:`, error.message);
  } else {
    success += 1;
    console.log(`[seed-blog] upserted ${a.slug}`);
  }
}
console.log(`[seed-blog] done — ${success}/${ARTICLES.length} succeeded`);
