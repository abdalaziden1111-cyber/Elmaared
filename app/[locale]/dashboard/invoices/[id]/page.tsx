import { notFound } from 'next/navigation';
import { Download } from 'lucide-react';
import { requireRole } from '@/lib/auth/require-role';
import { createAdminClient } from '@/lib/supabase/admin';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { ZatcaQrCode } from '@/components/legal/zatca-qr-code';
import { formatCurrency, formatDate } from '@/lib/utils/format';

// Phase U5.3 — Invoice / Receipt page (Plan v2 Decision #11 — ZATCA
// Phase 2 compliance). Renders the full invoice for one escrow transaction
// with the buyer's CR + VAT, line-item breakdown, VAT calculation, and
// the ZATCA-mandated QR code.

interface InvoiceRow {
  id: string;
  invoice_number: string;
  escrow_id: string;
  rfq_id: string;
  company_id: string;
  service_amount: number;
  platform_commission: number;
  vat_amount: number;
  total_invoiced: number;
  buyer_name: string;
  buyer_vat_number: string | null;
  buyer_cr_number: string | null;
  buyer_address: string | null;
  zatca_qr_code: string | null;
  issued_at: string;
}

interface RfqRow {
  id: string;
  rfq_number: string;
  title: string;
  client_id: string;
}

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: invoiceId } = await params;
  const { user } = await requireRole(['client']);
  const admin = createAdminClient();

  const { data: invRaw } = await admin
    .from('invoices')
    .select(
      'id, invoice_number, escrow_id, rfq_id, company_id, service_amount, platform_commission, vat_amount, total_invoiced, buyer_name, buyer_vat_number, buyer_cr_number, buyer_address, zatca_qr_code, issued_at',
    )
    .eq('id', invoiceId)
    .maybeSingle();
  const inv = invRaw as InvoiceRow | null;
  if (!inv) notFound();

  // Verify ownership via the parent RFQ (invoices have no client_id of
  // their own — they reference an rfq + company, which is the client's).
  const { data: rfqRaw } = await admin
    .from('rfqs')
    .select('id, rfq_number, title, client_id')
    .eq('id', inv.rfq_id)
    .single();
  const rfq = rfqRaw as RfqRow | null;
  if (!rfq || rfq.client_id !== user.id) notFound();

  const issuedDate = formatDate(inv.issued_at);

  return (
    <div className="mx-auto max-w-3xl">
      <Breadcrumbs
        items={[
          { href: '/dashboard', label: 'لوحة التحكم' },
          { href: '/dashboard/rfqs', label: 'طلباتي' },
          { href: `/dashboard/rfqs/${inv.rfq_id}`, label: rfq.rfq_number },
          { label: 'الفاتورة' },
        ]}
      />

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-midnight-green)]">
            الفاتورة <span className="num">{inv.invoice_number}</span>
          </h1>
          <p className="mt-1 text-xs text-[var(--color-stone-600)]">
            صادرة في {issuedDate} — متوافقة مع متطلبات هيئة الزكاة والضريبة
            والجمارك (ZATCA Phase 2).
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-stone-300)] px-4 py-2 text-sm font-medium text-[var(--color-midnight-green)] hover:border-[var(--color-action-blue)]"
          onClick={undefined /* PDF generation deferred — print stylesheet works in v1 */}
          disabled
          title="ميزة التحميل PDF قادمة"
        >
          <Download className="size-4" aria-hidden />
          تحميل PDF
        </button>
      </header>

      {/* Buyer info */}
      <section className="mt-6 rounded-2xl border border-[var(--color-stone-300)] bg-white p-5">
        <h2 className="text-sm font-semibold text-[var(--color-midnight-green)]">
          بيانات المشتري
        </h2>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-[var(--color-stone-600)]">الاسم التجاري</dt>
            <dd className="mt-0.5 font-medium">{inv.buyer_name}</dd>
          </div>
          {inv.buyer_vat_number ? (
            <div>
              <dt className="text-xs text-[var(--color-stone-600)]">الرقم الضريبي</dt>
              <dd className="mt-0.5 font-medium num">{inv.buyer_vat_number}</dd>
            </div>
          ) : null}
          {inv.buyer_cr_number ? (
            <div>
              <dt className="text-xs text-[var(--color-stone-600)]">السجل التجاري</dt>
              <dd className="mt-0.5 font-medium num">{inv.buyer_cr_number}</dd>
            </div>
          ) : null}
          {inv.buyer_address ? (
            <div>
              <dt className="text-xs text-[var(--color-stone-600)]">العنوان</dt>
              <dd className="mt-0.5 font-medium">{inv.buyer_address}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      {/* Line items + totals */}
      <section className="mt-4 rounded-2xl border border-[var(--color-stone-300)] bg-white p-5">
        <h2 className="text-sm font-semibold text-[var(--color-midnight-green)]">
          تفاصيل الفاتورة
        </h2>
        <table className="mt-3 w-full text-sm">
          <thead className="text-xs text-[var(--color-stone-600)]">
            <tr>
              <th className="py-2 text-start font-medium">البند</th>
              <th className="py-2 text-end font-medium">القيمة (﷼)</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-[var(--color-stone-300)]">
              <td className="py-2">قيمة الخدمة</td>
              <td className="py-2 text-end font-medium num">
                {formatCurrency(inv.service_amount)}
              </td>
            </tr>
            <tr className="border-t border-[var(--color-stone-300)]">
              <td className="py-2">عمولة المنصة</td>
              <td className="py-2 text-end font-medium num">
                {formatCurrency(inv.platform_commission)}
              </td>
            </tr>
            <tr className="border-t border-[var(--color-stone-300)]">
              <td className="py-2">ضريبة القيمة المضافة (15%)</td>
              <td className="py-2 text-end font-medium num">
                {formatCurrency(inv.vat_amount)}
              </td>
            </tr>
            <tr className="border-t-2 border-[var(--color-midnight-green)] bg-[var(--color-cream)]">
              <td className="py-3 font-semibold">الإجمالي</td>
              <td className="py-3 text-end text-lg font-bold text-[var(--color-midnight-green)] num">
                {formatCurrency(inv.total_invoiced)}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* ZATCA QR */}
      {inv.zatca_qr_code ? (
        <section
          className="mt-4 rounded-2xl border border-[var(--color-stone-300)] bg-white p-5"
          data-component="zatca-qr-section"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-xs">
              <h2 className="text-sm font-semibold text-[var(--color-midnight-green)]">
                رمز التحقق ZATCA
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-[var(--color-stone-600)]">
                امسح هذا الرمز للتحقق من صحة الفاتورة عبر تطبيق ZATCA
                الرسمي. يحتوي على بيانات البائع والإجمالي والضريبة
                وتوقيت الإصدار مشفّرة وفق Annex 1 من المواصفة الرسمية.
              </p>
            </div>
            <ZatcaQrCode tlvBase64={inv.zatca_qr_code} size={160} />
          </div>
        </section>
      ) : null}
    </div>
  );
}
