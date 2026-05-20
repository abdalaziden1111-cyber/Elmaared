// Phase V4.1 — Notification category mapping.

import { describe, it, expect } from 'vitest';
import {
  categoryOf,
  typesForCategory,
  NOTIFICATION_CATEGORY_TABS,
  NOTIFICATION_CATEGORY_LABELS,
  type NotificationType,
} from '@/lib/notifications/category';

const ALL_TYPES: NotificationType[] = [
  'rfq_new',
  'rfq_match',
  'proposal_received',
  'proposal_shortlisted',
  'proposal_accepted',
  'proposal_rejected',
  'agreement_pending',
  'escrow_deposit_required',
  'escrow_received',
  'work_started',
  'delivery_pending',
  'delivery_approved',
  'panic_button',
  'message',
  'system',
];

describe('categoryOf — exhaustive mapping', () => {
  it.each(ALL_TYPES.map((t) => [t]))('maps %s to a non-undefined category', (t) => {
    const cat = categoryOf(t);
    expect(cat).toBeTruthy();
    expect(NOTIFICATION_CATEGORY_TABS).toContain(cat);
  });

  it('rfq_match maps to rfq', () => {
    expect(categoryOf('rfq_match')).toBe('rfq');
  });
  it('proposal_received maps to proposal', () => {
    expect(categoryOf('proposal_received')).toBe('proposal');
  });
  it('message maps to chat', () => {
    expect(categoryOf('message')).toBe('chat');
  });
  it('escrow_received maps to payment', () => {
    expect(categoryOf('escrow_received')).toBe('payment');
  });
  it('system maps to system', () => {
    expect(categoryOf('system')).toBe('system');
  });
});

describe('typesForCategory', () => {
  it('returns null for all + unread (no type filter)', () => {
    expect(typesForCategory('all')).toBeNull();
    expect(typesForCategory('unread')).toBeNull();
  });

  it('returns the list of types that map to that category', () => {
    const rfqTypes = typesForCategory('rfq');
    expect(rfqTypes).not.toBeNull();
    expect(rfqTypes).toContain('rfq_match');
    expect(rfqTypes).toContain('rfq_new');
  });

  it('every type appears in exactly one category', () => {
    const accountedFor = new Set<NotificationType>();
    for (const cat of NOTIFICATION_CATEGORY_TABS) {
      const types = typesForCategory(cat);
      if (!types) continue;
      for (const t of types) {
        expect(accountedFor.has(t)).toBe(false);
        accountedFor.add(t);
      }
    }
    // All enum values accounted for.
    for (const t of ALL_TYPES) {
      expect(accountedFor.has(t)).toBe(true);
    }
  });
});

describe('labels', () => {
  it('has a non-empty Arabic label for every tab', () => {
    for (const tab of NOTIFICATION_CATEGORY_TABS) {
      expect(NOTIFICATION_CATEGORY_LABELS[tab]).toBeTruthy();
      expect(NOTIFICATION_CATEGORY_LABELS[tab].length).toBeGreaterThan(0);
    }
  });
});
