import { escapeHtml, escapeAttr } from '@/lib/utils/html';

// Plain-HTML email templates (RTL-friendly). React Email is intentionally
// not pulled in for Phase 2 — keeps the bundle lean. If we later need
// rich formatting we can swap to @react-email/components.
//
// IMPORTANT: every interpolated value comes from user-controlled fields
// (supplier company_name, rfq_number, etc.) so we route everything through
// escapeHtml/escapeAttr to prevent injecting markup into recipients' inboxes.

const COLORS = {
  cream: '#FAF8F4',
  stone100: '#F2EEE7',
  stone300: '#D8D2C7',
  stone600: '#7A766F',
  charcoal: '#1A1A1A',
  midnight: '#0E3B43',
  gold: '#C8A24C',
};

function shell({ preview, body }: { preview: string; body: string }) {
  const safePreview = escapeHtml(preview);
  return `<!doctype html>
<html dir="rtl" lang="ar">
<head><meta charset="utf-8"><meta name="x-apple-disable-message-reformatting"><title>${safePreview}</title></head>
<body style="background:${COLORS.cream};font-family:system-ui,sans-serif;margin:0;padding:0;">
  <span style="display:none;visibility:hidden;opacity:0;color:transparent;height:0;width:0;">${safePreview}</span>
  <div style="max-width:560px;margin:40px auto;padding:24px;background:${COLORS.stone100};border-radius:12px;">
    <div style="font-size:14px;font-weight:700;color:${COLORS.midnight};margin-bottom:16px;">تطبيق المعارض</div>
    ${body}
    <hr style="border:none;border-top:1px solid ${COLORS.stone300};margin:20px 0;">
    <p style="font-size:12px;color:${COLORS.stone600};text-align:center;margin:0;">
      وصلتك هذه الرسالة لأنك مسجّل في تطبيق المعارض.
    </p>
  </div>
</body>
</html>`;
}

export interface RfqMatchVars {
  supplierName: string;
  rfqNumber: string;
  serviceTypeAr: string;
  city: string;
  budgetRange: string | null;
  deadline: string;
  rfqUrl: string;
}

export function rfqMatchEmail(v: RfqMatchVars): { subject: string; html: string } {
  const subject = `طلب جديد يطابق تخصصك (${v.rfqNumber})`;

  // Escape every interpolated user-controlled value. The URL goes through
  // escapeAttr because it lives inside an href attribute.
  const safe = {
    supplierName: escapeHtml(v.supplierName),
    rfqNumber: escapeHtml(v.rfqNumber),
    serviceTypeAr: escapeHtml(v.serviceTypeAr),
    city: escapeHtml(v.city),
    budgetRange: escapeHtml(v.budgetRange ?? 'لم تُحدد'),
    deadline: escapeHtml(v.deadline),
    rfqUrl: escapeAttr(v.rfqUrl),
  };

  const body = `
    <h1 style="font-size:20px;color:${COLORS.midnight};margin:0 0 12px 0;">طلب جديد يناسب خبرتك</h1>
    <p style="font-size:14px;line-height:1.6;color:${COLORS.charcoal};margin:0 0 12px 0;">مرحباً ${safe.supplierName}،</p>
    <p style="font-size:14px;line-height:1.6;color:${COLORS.charcoal};margin:0 0 12px 0;">وصلنا طلب RFQ جديد يطابق تخصصاتك. تفاصيل سريعة:</p>
    <div style="background:${COLORS.cream};padding:16px;border-radius:8px;margin-bottom:16px;font-size:13px;">
      <div style="display:flex;justify-content:space-between;padding:4px 0;"><span style="color:${COLORS.stone600};">رقم الطلب</span><span style="color:${COLORS.charcoal};font-weight:600;">${safe.rfqNumber}</span></div>
      <div style="display:flex;justify-content:space-between;padding:4px 0;"><span style="color:${COLORS.stone600};">نوع الخدمة</span><span style="color:${COLORS.charcoal};font-weight:600;">${safe.serviceTypeAr}</span></div>
      <div style="display:flex;justify-content:space-between;padding:4px 0;"><span style="color:${COLORS.stone600};">المدينة</span><span style="color:${COLORS.charcoal};font-weight:600;">${safe.city}</span></div>
      <div style="display:flex;justify-content:space-between;padding:4px 0;"><span style="color:${COLORS.stone600};">الميزانية</span><span style="color:${COLORS.charcoal};font-weight:600;">${safe.budgetRange}</span></div>
      <div style="display:flex;justify-content:space-between;padding:4px 0;"><span style="color:${COLORS.stone600};">آخر موعد</span><span style="color:${COLORS.charcoal};font-weight:600;">${safe.deadline}</span></div>
    </div>
    <div style="text-align:center;padding:16px 0;">
      <a href="${safe.rfqUrl}" style="display:inline-block;padding:10px 20px;background:${COLORS.midnight};color:${COLORS.cream};text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">افتح الطلب وقدّم عرضك ←</a>
    </div>
  `;
  return { subject, html: shell({ preview: subject, body }) };
}

// V1.3 — Hot-lead transition alert to admins. Triggered by the nightly
// batch when a user's category flips from non-hot → hot AND no email has
// been sent in the last 7 days for that user.
export interface LeadHotTransitionVars {
  userName: string;
  userEmail: string;
  role: 'client' | 'supplier';
  score: number;
  previousCategory: 'warm' | 'cold' | null;
  adminLeadsUrl: string;
  highlightSignals: string[];
}

export function leadHotTransitionEmail(
  v: LeadHotTransitionVars
): { subject: string; html: string } {
  const subject = `لقاء جديد ساخن 🔥 — ${v.userName} (${v.score}/100)`;
  const safe = {
    userName: escapeHtml(v.userName),
    userEmail: escapeHtml(v.userEmail),
    role: escapeHtml(v.role === 'client' ? 'عميل' : 'مورد'),
    score: escapeHtml(String(v.score)),
    previousCategory: escapeHtml(
      v.previousCategory === 'warm' ? 'دافئ' : v.previousCategory === 'cold' ? 'بارد' : 'جديد'
    ),
    adminLeadsUrl: escapeAttr(v.adminLeadsUrl),
    signalsHtml: v.highlightSignals
      .map(
        (s) =>
          `<li style="padding:4px 0;color:${COLORS.charcoal};font-size:13px;">${escapeHtml(s)}</li>`
      )
      .join(''),
  };
  const body = `
    <h1 style="font-size:20px;color:${COLORS.midnight};margin:0 0 12px 0;">لقاء انتقل للحالة الساخنة</h1>
    <p style="font-size:14px;line-height:1.6;color:${COLORS.charcoal};margin:0 0 12px 0;">
      المستخدم <strong>${safe.userName}</strong> (${safe.role}) انتقل من <strong>${safe.previousCategory}</strong> إلى <strong>ساخن 🔥</strong>.
    </p>
    <div style="background:${COLORS.cream};padding:16px;border-radius:8px;margin-bottom:16px;font-size:13px;">
      <div style="display:flex;justify-content:space-between;padding:4px 0;"><span style="color:${COLORS.stone600};">الاسم</span><span style="color:${COLORS.charcoal};font-weight:600;">${safe.userName}</span></div>
      <div style="display:flex;justify-content:space-between;padding:4px 0;"><span style="color:${COLORS.stone600};">البريد</span><span style="color:${COLORS.charcoal};font-weight:600;">${safe.userEmail}</span></div>
      <div style="display:flex;justify-content:space-between;padding:4px 0;"><span style="color:${COLORS.stone600};">الدور</span><span style="color:${COLORS.charcoal};font-weight:600;">${safe.role}</span></div>
      <div style="display:flex;justify-content:space-between;padding:4px 0;"><span style="color:${COLORS.stone600};">الدرجة</span><span style="color:${COLORS.gold};font-weight:700;">${safe.score}/100</span></div>
    </div>
    ${
      v.highlightSignals.length > 0
        ? `<p style="font-size:13px;color:${COLORS.stone600};margin:0 0 8px 0;">أبرز الإشارات:</p>
           <ul style="margin:0 0 16px 18px;padding:0;">${safe.signalsHtml}</ul>`
        : ''
    }
    <div style="text-align:center;padding:16px 0;">
      <a href="${safe.adminLeadsUrl}" style="display:inline-block;padding:10px 20px;background:${COLORS.midnight};color:${COLORS.cream};text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">افتح لوحة اللقاءات ←</a>
    </div>
  `;
  return { subject, html: shell({ preview: subject, body }) };
}
