// Storage bucket for client-uploaded RFQ attachments (logo + design refs).
// File layout: <auth-user-id>/<kind>-<timestamp>.<ext>
// Kinds: 'logo' (single primary brand asset) | 'attachment' (free supporting files).
// All access goes through signed URLs generated server-side.

export const RFQ_ATTACHMENTS_BUCKET = 'rfq-attachments';

export type RfqAttachmentKind = 'logo' | 'attachment';
export const RFQ_ATTACHMENT_KINDS: RfqAttachmentKind[] = ['logo', 'attachment'];

export const RFQ_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024; // 10 MB
export const RFQ_ATTACHMENT_MIME_EXT: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
