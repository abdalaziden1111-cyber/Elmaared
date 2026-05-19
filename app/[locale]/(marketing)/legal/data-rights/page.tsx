import { setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { Mail, Download, Edit3, Trash2, Eye } from 'lucide-react';

// UX Plan v2 Decision #11 (Sprint 5 S5.4) — Saudi PDPL "Data Subject
// Rights" portal. Explains the user's rights under the Personal Data
// Protection Law and lists the channels to exercise them.
//
// We deliberately keep this page server-rendered + mailto-driven instead
// of building a form + queue at this stage. The committee's compliance
// matrix calls for a working DSR channel before launch; ops can satisfy
// that with an email inbox + ticketing today. A self-serve form +
// admin-queue table will land in a future Track O sprint.

export const metadata: Metadata = {
  title: 'مركز حقوق البيانات | Elmaared',
  description:
    'حقوقك بموجب نظام حماية البيانات الشخصية السعودي (PDPL): الاطلاع، التصحيح، الحذف، النقل، والاعتراض.',
};

interface Right {
  title: string;
  icon: typeof Mail;
  body: string;
  /** Mailto subject prefilled when the user clicks "تواصل لطلب الحق". */
  subject: string;
}

const RIGHTS: Right[] = [
  {
    title: 'حق الاطلاع',
    icon: Eye,
    body: 'لك الحق في معرفة البيانات الشخصية التي نحتفظ بها عنك، ومصادرها، والغرض من معالجتها، ومن نشاركها معه.',
    subject: 'طلب اطلاع — بياناتي على Elmaared',
  },
  {
    title: 'حق الحصول على نسخة',
    icon: Download,
    body: 'تستطيع طلب نسخة قابلة للقراءة من بياناتك بصيغة JSON أو CSV خلال ٣٠ يوماً من تقديم الطلب.',
    subject: 'طلب نسخة من بياناتي — Elmaared',
  },
  {
    title: 'حق التصحيح',
    icon: Edit3,
    body: 'إذا وجدت بياناتك غير دقيقة أو منتهية الصلاحية، تستطيع طلب تصحيحها وسننفذ ذلك خلال ٧ أيام عمل.',
    subject: 'طلب تصحيح بياناتي على Elmaared',
  },
  {
    title: 'حق الحذف',
    icon: Trash2,
    body: 'تستطيع طلب حذف بياناتك ما لم تكن مرتبطة بصفقة جارية أو التزام تنظيمي (فواتير ZATCA، سجلات SAMA). الباقي يُحذف خلال ١٤ يوماً.',
    subject: 'طلب حذف بياناتي — Elmaared',
  },
];

const DPO_EMAIL = 'privacy@elmaared.com';

export default async function DataRightsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as 'ar' | 'en');

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-4xl font-semibold text-[var(--color-midnight-green)]">
        مركز حقوق البيانات
      </h1>
      <p className="mt-2 text-xs text-[var(--color-stone-600)]">
        وفقاً لنظام حماية البيانات الشخصية السعودي (PDPL).
      </p>

      <section className="mt-6 rounded-2xl border border-dashed border-[var(--color-action-blue)] bg-[var(--color-info-100)] p-5 text-sm leading-relaxed text-[var(--color-charcoal)]">
        <p>
          Elmaored يلتزم بالنظام السعودي رقم (م/١٩) لعام ١٤٤٣هـ لحماية
          البيانات الشخصية، وبالقرارات التنفيذية الصادرة عن الهيئة السعودية
          للبيانات والذكاء الاصطناعي (SDAIA). الصفحة أدناه تلخّص حقوقك
          وكيفية ممارستها.
        </p>
      </section>

      <section className="mt-10 grid gap-4 sm:grid-cols-2">
        {RIGHTS.map((r) => {
          const Icon = r.icon;
          const mailto = `mailto:${DPO_EMAIL}?subject=${encodeURIComponent(r.subject)}`;
          return (
            <article
              key={r.title}
              className="rounded-2xl border border-[var(--color-stone-300)] bg-white p-5"
              data-component="data-right-card"
            >
              <header className="flex items-center gap-2 text-base font-semibold text-[var(--color-midnight-green)]">
                <Icon className="size-4 text-[var(--color-action-blue)]" aria-hidden />
                {r.title}
              </header>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-stone-600)]">
                {r.body}
              </p>
              <a
                href={mailto}
                className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-xl bg-[var(--color-action-blue)] px-4 text-xs font-semibold text-[var(--color-cream)] hover:bg-[var(--color-action-blue-700)]"
              >
                <Mail className="size-3.5" aria-hidden />
                تواصل لطلب الحق
              </a>
            </article>
          );
        })}
      </section>

      <section className="mt-10 rounded-2xl bg-[var(--color-cream)] p-5 text-sm">
        <h2 className="text-base font-semibold text-[var(--color-midnight-green)]">
          مسؤول حماية البيانات (DPO)
        </h2>
        <p className="mt-2 leading-relaxed text-[var(--color-charcoal)]">
          أي طلب أو شكوى تخصّ بياناتك الشخصية يُرسَل إلى مسؤول حماية البيانات
          على:{' '}
          <a
            className="font-medium text-[var(--color-action-blue)] hover:underline"
            href={`mailto:${DPO_EMAIL}`}
          >
            {DPO_EMAIL}
          </a>
          . مدّة الرد الرسمية: حتى ٧ أيام عمل لطلبات التصحيح، و٣٠ يوماً
          للطلبات المعقّدة (الحذف، النسخة الكاملة).
        </p>
        <p className="mt-3 leading-relaxed text-[var(--color-stone-600)]">
          لو لم تتلقَ ردّاً مناسباً خلال ٣٠ يوماً، يحق لك تقديم شكوى مباشرة
          إلى الهيئة السعودية للبيانات والذكاء الاصطناعي (SDAIA) عبر منصتها
          الإلكترونية.
        </p>
      </section>
    </main>
  );
}
