'use client';

import { QRCodeSVG } from 'qrcode.react';

/**
 * ZATCA Phase-2 QR code (UX Plan v2 Decision #11, Sprint 5 S5.4).
 *
 * The Saudi Zakat / Tax / Customs Authority requires every e-invoice
 * (Phase 2) to embed a TLV-encoded QR code with the seller's name,
 * VAT number, invoice timestamp, total + VAT amounts, and a hash of
 * the invoice payload. The encoding is done server-side by the
 * invoice-issuance pipeline; this component just renders the resulting
 * base64 string as a scannable QR.
 *
 * Why not encode here: the TLV layout (Annex 1 of ZATCA's e-invoice
 * specification) is tax law, not UI concern. Encoding in the browser
 * would risk a hashing mismatch with the server's signed invoice.
 *
 * If `tlvBase64` is empty / missing, we render a neutral placeholder
 * tile instead of an unreadable QR. The Receipt page already gates on
 * `tlvBase64` being present before mounting us, but the placeholder is
 * a defense-in-depth.
 */

interface Props {
  /** Base64-encoded TLV payload produced by the ZATCA pipeline. */
  tlvBase64: string;
  /** Pixel side length. ZATCA mandates ≥ 200×200 for printed invoices. */
  size?: number;
  className?: string;
}

export function ZatcaQrCode({ tlvBase64, size = 200, className = '' }: Props) {
  if (!tlvBase64 || tlvBase64.length === 0) {
    return (
      <div
        data-component="zatca-qr-code"
        data-state="empty"
        className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-stone-300)] bg-[var(--color-stone-100)] p-4 ${className}`}
        style={{ width: size, height: size }}
        aria-label="رمز ZATCA QR قيد الإصدار"
      >
        <p className="text-center text-xs text-[var(--color-stone-600)]">
          رمز ZATCA QR قيد الإصدار
        </p>
      </div>
    );
  }

  return (
    <figure
      data-component="zatca-qr-code"
      data-state="ready"
      className={`flex flex-col items-center gap-2 ${className}`}
      aria-label="رمز ZATCA QR للفاتورة الإلكترونية"
    >
      <div className="rounded-xl bg-white p-3 ring-1 ring-[var(--color-stone-300)]">
        <QRCodeSVG
          value={tlvBase64}
          size={size}
          level="M"
          marginSize={0}
          // The white background is non-negotiable for ZATCA scanability.
          bgColor="#FFFFFF"
          fgColor="#0E3B43"
        />
      </div>
      <figcaption className="text-[0.65rem] font-medium uppercase tracking-wider text-[var(--color-stone-600)]">
        ZATCA Phase 2
      </figcaption>
    </figure>
  );
}
