// Notification payload builder. Every workflow event (RFQ matched, proposal
// shortlisted, panic raised, escrow received, delivery approved, etc.) needs
// a consistent {title, body, link} for both in-app rendering and email
// fanout. Centralizing the templates means:
//   1. Arabic copy is reviewed in one place, not scattered across actions
//   2. Adding a new notification type requires a discriminated-union branch,
//      so the compiler catches missing cases
//   3. Tests can verify every type produces non-empty title + valid link
//
// `locale` is the recipient's preferred language read from
// `profiles.preferred_language`. It picks the URL prefix; copy stays Arabic
// for now (English copy is a follow-up i18n round).

import type { Database } from '@/lib/supabase/types';

type NotificationType = Database['public']['Enums']['notification_type'];
export type NotificationLocale = 'ar' | 'en';

export interface NotificationPayload {
  title: string;
  body: string | null;
  link: string;
}

export type BuildNotificationArgs =
  | { type: 'rfq_match'; rfqNumber: string; rfqTitle: string; rfqId: string }
  | { type: 'proposal_received'; rfqNumber: string; supplierName: string; rfqId: string }
  | { type: 'proposal_shortlisted'; rfqNumber: string; chatId: string }
  | { type: 'proposal_accepted'; rfqNumber: string; rfqId: string }
  | { type: 'proposal_rejected'; rfqNumber: string }
  | { type: 'agreement_pending'; rfqNumber: string; rfqId: string }
  | { type: 'escrow_deposit_required'; rfqNumber: string; amount: number; rfqId: string }
  | { type: 'escrow_received'; rfqNumber: string; rfqId: string }
  | { type: 'work_started'; rfqNumber: string; rfqId: string }
  | { type: 'delivery_pending'; rfqNumber: string; rfqId: string }
  | { type: 'delivery_approved'; rfqNumber: string; rfqId: string }
  | { type: 'panic_button'; rfqNumber: string; chatId: string; reason: string }
  | { type: 'message'; senderName: string; rfqId: string; chatId: string; preview: string }
  | { type: 'system'; title: string; body: string; link?: string };

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://app-exhibition.sa').replace(
  /\/$/,
  ''
);

const DEFAULT_LOCALE: NotificationLocale = 'ar';

function normalizeLocale(locale: string | null | undefined): NotificationLocale {
  return locale === 'en' || locale === 'ar' ? locale : DEFAULT_LOCALE;
}

function clientUrl(locale: NotificationLocale, path: string): string {
  return `${APP_URL}/${locale}${path}`;
}
function supplierUrl(locale: NotificationLocale, path: string): string {
  return `${APP_URL}/${locale}${path}`;
}
function adminUrl(path: string): string {
  // Admin routes have no locale prefix by design.
  return `${APP_URL}${path}`;
}

export function buildNotification(
  args: BuildNotificationArgs,
  locale: string | null | undefined = DEFAULT_LOCALE
): NotificationPayload {
  const l = normalizeLocale(locale);
  switch (args.type) {
    case 'rfq_match':
      return {
        title: 'طلب جديد يطابق تخصصك',
        body: `${args.rfqNumber} — ${args.rfqTitle}`,
        link: supplierUrl(l, `/supplier/rfqs/${args.rfqId}`),
      };
    case 'proposal_received':
      return {
        title: 'عرض جديد على طلبك',
        body: `${args.supplierName} قدّم عرضاً على ${args.rfqNumber}`,
        link: clientUrl(l, `/dashboard/rfqs/${args.rfqId}/compare`),
      };
    case 'proposal_shortlisted':
      return {
        title: 'تمّ ترشيح عرضك',
        body: `العميل ترشّح عرضك على ${args.rfqNumber} وفتح محادثة`,
        link: supplierUrl(l, `/supplier/chats/${args.chatId}`),
      };
    case 'proposal_accepted':
      return {
        title: 'مبروك! عرضك مقبول',
        body: `العميل اختار عرضك على ${args.rfqNumber}`,
        link: supplierUrl(l, `/supplier/rfqs/${args.rfqId}`),
      };
    case 'proposal_rejected':
      return {
        title: 'تم رفض عرضك',
        body: `العميل اختار مورداً آخر على ${args.rfqNumber}`,
        link: supplierUrl(l, '/supplier/rfqs'),
      };
    case 'agreement_pending':
      return {
        title: 'الاتفاق ينتظر فهمك',
        body: `اكتب فهمك لمشروع ${args.rfqNumber}`,
        link: clientUrl(l, `/dashboard/rfqs/${args.rfqId}/agreement`),
      };
    case 'escrow_deposit_required':
      return {
        title: 'مطلوب إيداع مبدئي',
        body: `حوّل ${args.amount.toLocaleString('en')} ﷼ لبدء التنفيذ على ${args.rfqNumber}`,
        link: clientUrl(l, `/dashboard/rfqs/${args.rfqId}/escrow`),
      };
    case 'escrow_received':
      return {
        title: 'تأكدنا استلام الإيداع',
        body: `يمكنك بدء العمل على ${args.rfqNumber}`,
        link: supplierUrl(l, `/supplier/rfqs/${args.rfqId}`),
      };
    case 'work_started':
      return {
        title: 'بدأ العمل على مشروعك',
        body: `المورد بدأ التنفيذ على ${args.rfqNumber}`,
        link: clientUrl(l, `/dashboard/rfqs/${args.rfqId}`),
      };
    case 'delivery_pending':
      return {
        title: 'تسليم بانتظار اعتمادك',
        body: `راجع التسليم لـ ${args.rfqNumber} واعتمده`,
        link: clientUrl(l, `/dashboard/rfqs/${args.rfqId}/escrow`),
      };
    case 'delivery_approved':
      return {
        title: 'تمّ اعتماد التسليم',
        body: `الدفعة النهائية ستُحرّر بعد المراجعة الإدارية`,
        link: supplierUrl(l, `/supplier/rfqs/${args.rfqId}`),
      };
    case 'panic_button':
      return {
        title: '🚨 تصعيد عاجل',
        body: `${args.rfqNumber}: ${truncate(args.reason, 120)}`,
        link: adminUrl('/admin'),
      };
    case 'message':
      return {
        title: `رسالة من ${args.senderName}`,
        body: truncate(args.preview, 120),
        link: clientUrl(l, `/dashboard/rfqs/${args.rfqId}/chats/${args.chatId}`),
      };
    case 'system':
      return {
        title: args.title,
        body: args.body,
        link: args.link ?? clientUrl(l, '/dashboard/notifications'),
      };
    default: {
      // Exhaustiveness check — if a new NotificationType is added without
      // a case here, this assignment becomes a TS error.
      const _exhaustive: never = args;
      void _exhaustive;
      return {
        title: 'إشعار',
        body: null,
        link: clientUrl(l, '/dashboard/notifications'),
      };
    }
  }
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + '…';
}

/** Maps a BuildNotificationArgs to its persisted notification_type column value. */
export function notificationTypeOf(
  args: BuildNotificationArgs
): NotificationType {
  return args.type;
}
