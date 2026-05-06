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

export type SendResult =
  | { id: string; skipped: false; error?: undefined }
  | { id: 'dev-mode'; skipped: true; error?: undefined }
  | { id: null; skipped: false; error: string };

const TRANSIENT_RETRY_DELAY_MS = 500;

/**
 * Send an email via Resend. Designed never to throw — every failure path
 * returns a structured result so callers can decide whether to log, retry,
 * or fall back. The dev-mode branch lets local development run without an
 * API key (we just log what we would have sent).
 *
 * On a network error or 5xx-style failure we retry once after a short delay.
 * Validation errors (4xx) aren't retried because they'd just fail the same way.
 */
export async function sendEmail(payload: EmailPayload): Promise<SendResult> {
  if (!resend) {
    console.log('[email] (no RESEND_API_KEY) Would send:', payload.subject, 'to', payload.to);
    return { id: 'dev-mode', skipped: true };
  }

  const recipients = Array.isArray(payload.to) ? payload.to : [payload.to];
  if (recipients.length === 0) {
    return { id: null, skipped: false, error: 'No recipients provided' };
  }

  const args = {
    from: `${FROM_NAME} <${FROM_EMAIL}>`,
    to: recipients,
    subject: payload.subject,
    html: payload.html,
    replyTo: payload.replyTo,
  };

  // First attempt
  const first = await trySend(args);
  if (first.success) {
    return { id: first.id, skipped: false };
  }
  if (!isTransient(first.error)) {
    return { id: null, skipped: false, error: first.error };
  }

  // Retry once after a brief delay
  await sleep(TRANSIENT_RETRY_DELAY_MS);
  const second = await trySend(args);
  if (second.success) {
    return { id: second.id, skipped: false };
  }
  return { id: null, skipped: false, error: second.error };
}

interface TrySendOk {
  success: true;
  id: string;
}
interface TrySendErr {
  success: false;
  error: string;
}

async function trySend(args: {
  from: string;
  to: string[];
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<TrySendOk | TrySendErr> {
  if (!resend) return { success: false, error: 'Resend client not initialized' };

  try {
    const { data, error } = await resend.emails.send(args);
    if (error) {
      console.error('[email] Resend API error:', error.message ?? error);
      return { success: false, error: error.message ?? String(error) };
    }
    if (!data?.id) {
      return { success: false, error: 'Resend returned no id' };
    }
    return { success: true, id: data.id };
  } catch (err) {
    // Network-level errors (DNS, TCP reset, timeout) — definitely transient
    const message = err instanceof Error ? err.message : String(err);
    console.error('[email] Resend send threw:', message);
    return { success: false, error: message };
  }
}

function isTransient(error: string): boolean {
  // Heuristic: rate-limit + 5xx + network errors are worth retrying.
  // 4xx validation errors are not — they'd fail the same way next time.
  const lower = error.toLowerCase();
  return (
    lower.includes('rate limit') ||
    lower.includes('timeout') ||
    lower.includes('network') ||
    lower.includes('econn') ||
    lower.includes('5')
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
