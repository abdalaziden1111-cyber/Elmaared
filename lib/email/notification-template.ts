// Phase V4.2 — Generic transactional notification email.
//
// One shell used by every notification_type — the dispatcher passes title
// + body + link and we render a consistent RTL Arabic layout. Specific
// per-type templates (rfqMatchEmail, leadHotTransitionEmail) still live in
// templates.ts for richer copy; this is the fallback when an action
// routes through dispatchNotification() without a bespoke template.

import { escapeHtml, escapeAttr } from '@/lib/utils/html';

const COLORS = {
  cream: '#FAF8F4',
  stone100: '#F2EEE7',
  stone300: '#D8D2C7',
  stone600: '#7A766F',
  charcoal: '#1A1A1A',
  midnight: '#0E3B43',
};

export interface NotificationEmailVars {
  title: string;
  body: string | null;
  link: string;
}

export function notificationEmail(v: NotificationEmailVars): {
  subject: string;
  html: string;
} {
  const subject = v.title;
  const safe = {
    title: escapeHtml(v.title),
    body: v.body ? escapeHtml(v.body) : '',
    link: escapeAttr(v.link),
  };
  const html = `<!doctype html>
<html dir="rtl" lang="ar">
<head><meta charset="utf-8"><title>${safe.title}</title></head>
<body style="background:${COLORS.cream};font-family:system-ui,sans-serif;margin:0;padding:0;">
  <div style="max-width:560px;margin:40px auto;padding:24px;background:${COLORS.stone100};border-radius:12px;">
    <div style="font-size:14px;font-weight:700;color:${COLORS.midnight};margin-bottom:16px;">تطبيق المعارض</div>
    <h1 style="font-size:18px;color:${COLORS.midnight};margin:0 0 12px 0;">${safe.title}</h1>
    ${
      safe.body
        ? `<p style="font-size:14px;line-height:1.6;color:${COLORS.charcoal};margin:0 0 16px 0;">${safe.body}</p>`
        : ''
    }
    <div style="text-align:center;padding:8px 0;">
      <a href="${safe.link}" style="display:inline-block;padding:10px 20px;background:${COLORS.midnight};color:${COLORS.cream};text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">افتح الإشعار ←</a>
    </div>
    <hr style="border:none;border-top:1px solid ${COLORS.stone300};margin:20px 0;">
    <p style="font-size:12px;color:${COLORS.stone600};text-align:center;margin:0;">
      وصلتك هذه الرسالة لأنك مسجّل في تطبيق المعارض. لإيقاف هذا النوع من الإشعارات، افتح إعدادات الإشعارات.
    </p>
  </div>
</body>
</html>`;
  return { subject, html };
}
