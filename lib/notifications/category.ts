// Phase V4.1 — Map notification_type enum values into the 7 tab buckets
// shown on the rebuilt notifications page.

import type { Database } from '@/lib/supabase/types';

export type NotificationType = Database['public']['Enums']['notification_type'];

export type NotificationCategory =
  | 'all'
  | 'unread'
  | 'rfq'
  | 'proposal'
  | 'chat'
  | 'payment'
  | 'review'
  | 'system';

const TYPE_TO_CATEGORY: Record<NotificationType, Exclude<NotificationCategory, 'all' | 'unread'>> = {
  rfq_new: 'rfq',
  rfq_match: 'rfq',
  proposal_received: 'proposal',
  proposal_shortlisted: 'proposal',
  proposal_accepted: 'proposal',
  proposal_rejected: 'proposal',
  agreement_pending: 'proposal',
  escrow_deposit_required: 'payment',
  escrow_received: 'payment',
  work_started: 'rfq',
  delivery_pending: 'rfq',
  delivery_approved: 'payment',
  panic_button: 'chat',
  message: 'chat',
  system: 'system',
};

export function categoryOf(type: NotificationType): NotificationCategory {
  return TYPE_TO_CATEGORY[type] ?? 'system';
}

/**
 * Resolve a tab selection to the list of types to filter on. 'all' and
 * 'unread' return null (caller skips the type filter entirely).
 */
export function typesForCategory(
  category: NotificationCategory
): NotificationType[] | null {
  if (category === 'all' || category === 'unread') return null;
  return (
    Object.entries(TYPE_TO_CATEGORY)
      .filter(([, cat]) => cat === category)
      .map(([t]) => t as NotificationType)
  );
}

export const NOTIFICATION_CATEGORY_LABELS: Record<NotificationCategory, string> = {
  all: 'الكل',
  unread: 'غير مقروء',
  rfq: 'الطلبات',
  proposal: 'العروض',
  chat: 'المحادثات',
  payment: 'المدفوعات',
  review: 'التقييمات',
  system: 'النظام',
};

export const NOTIFICATION_CATEGORY_TABS: NotificationCategory[] = [
  'all',
  'unread',
  'rfq',
  'proposal',
  'chat',
  'payment',
  'review',
  'system',
];
