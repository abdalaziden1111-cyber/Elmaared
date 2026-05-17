import {
  RFQ_STATUS_LABEL,
  RFQ_STATUS_TONE,
  PROPOSAL_STATUS_LABEL,
  PROPOSAL_STATUS_TONE,
} from '@/lib/constants/labels';

const FALLBACK_TONE =
  'bg-[var(--color-stone-100)] text-[var(--color-stone-600)]';

// Shared status-pill UI. Centralises the chip styling so every status
// readout across personas is visually identical. New status families can
// be added by extending the kind union + the corresponding label/tone maps
// in `lib/constants/labels.ts`.
export function StatusPill({
  status,
  kind = 'rfq',
  className = '',
}: {
  status: string;
  kind?: 'rfq' | 'proposal';
  className?: string;
}) {
  const label =
    kind === 'proposal'
      ? PROPOSAL_STATUS_LABEL[status] ?? status
      : RFQ_STATUS_LABEL[status] ?? status;
  const tone =
    (kind === 'proposal' ? PROPOSAL_STATUS_TONE[status] : RFQ_STATUS_TONE[status]) ??
    FALLBACK_TONE;

  return (
    <span
      className={`inline-flex h-7 shrink-0 items-center rounded-full px-3 text-xs font-medium ${tone} ${className}`}
    >
      {label}
    </span>
  );
}
