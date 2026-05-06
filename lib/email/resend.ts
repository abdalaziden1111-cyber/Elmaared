import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY;

export const resend = apiKey ? new Resend(apiKey) : null;

export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'noreply@app-exhibition.sa';
export const FROM_NAME = 'تطبيق المعارض';

export interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}

export async function sendEmail(payload: EmailPayload) {
  if (!resend) {
    console.log('[email] (no RESEND_API_KEY) Would send:', payload.subject, 'to', payload.to);
    return { id: 'dev-mode', skipped: true };
  }

  const { data, error } = await resend.emails.send({
    from: `${FROM_NAME} <${FROM_EMAIL}>`,
    to: Array.isArray(payload.to) ? payload.to : [payload.to],
    subject: payload.subject,
    html: payload.html,
    replyTo: payload.replyTo,
  });

  if (error) {
    console.error('[email] Resend error:', error);
    return { id: null, skipped: false, error: error.message };
  }

  return { id: data?.id, skipped: false };
}
