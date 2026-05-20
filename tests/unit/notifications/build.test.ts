import { describe, it, expect } from 'vitest';
import {
  buildNotification,
  notificationTypeOf,
  type BuildNotificationArgs,
} from '@/lib/notifications/build';

const ALL_TYPES: BuildNotificationArgs[] = [
  { type: 'rfq_match', rfqNumber: 'RFQ-1', rfqTitle: 'Booth', rfqId: 'r1' },
  { type: 'proposal_received', rfqNumber: 'RFQ-1', supplierName: 'Co', rfqId: 'r1' },
  { type: 'proposal_shortlisted', rfqNumber: 'RFQ-1', chatId: 'c1' },
  { type: 'proposal_accepted', rfqNumber: 'RFQ-1', rfqId: 'r1' },
  { type: 'proposal_rejected', rfqNumber: 'RFQ-1' },
  { type: 'agreement_pending', rfqNumber: 'RFQ-1', rfqId: 'r1' },
  { type: 'escrow_deposit_required', rfqNumber: 'RFQ-1', amount: 50000, rfqId: 'r1' },
  { type: 'escrow_received', rfqNumber: 'RFQ-1', rfqId: 'r1' },
  { type: 'work_started', rfqNumber: 'RFQ-1', rfqId: 'r1' },
  { type: 'delivery_pending', rfqNumber: 'RFQ-1', rfqId: 'r1' },
  { type: 'delivery_approved', rfqNumber: 'RFQ-1', rfqId: 'r1' },
  { type: 'panic_button', rfqNumber: 'RFQ-1', chatId: 'c1', reason: 'urgent' },
  { type: 'message', senderName: 'Sara', rfqId: 'r1', chatId: 'c1', preview: 'hello' },
  { type: 'system', title: 'maintenance', body: 'down for 5 min' },
];

describe('buildNotification — every type produces a valid payload', () => {
  it.each(ALL_TYPES.map((a) => [a.type, a] as const))(
    'type %s has non-empty title + valid link',
    (_type, args) => {
      const out = buildNotification(args);
      expect(out.title.length).toBeGreaterThan(0);
      // Either absolute URL or starts with /
      expect(out.link).toMatch(/^https?:\/\/|^\//);
    }
  );
});

describe('buildNotification — RFQ match', () => {
  it('renders RFQ number and title in body', () => {
    const out = buildNotification({
      type: 'rfq_match',
      rfqNumber: 'RFQ-2026-00007',
      rfqTitle: 'Booth for LEAP',
      rfqId: 'rfq-1',
    });
    expect(out.title).toMatch(/تخصصك/);
    expect(out.body).toContain('RFQ-2026-00007');
    expect(out.body).toContain('Booth for LEAP');
    expect(out.link).toContain('/supplier/rfqs/rfq-1');
  });
});

describe('buildNotification — escrow deposit required', () => {
  it('formats amount with locale grouping', () => {
    const out = buildNotification({
      type: 'escrow_deposit_required',
      rfqNumber: 'RFQ-1',
      amount: 51150,
      rfqId: 'rfq-1',
    });
    expect(out.body).toContain('51,150');
  });

  it('points to the client escrow page', () => {
    const out = buildNotification({
      type: 'escrow_deposit_required',
      rfqNumber: 'RFQ-1',
      amount: 1000,
      rfqId: 'rfq-1',
    });
    expect(out.link).toContain('/dashboard/rfqs/rfq-1/escrow');
  });
});

describe('buildNotification — message preview truncation', () => {
  it('truncates long previews to 120 chars', () => {
    const long = 'x'.repeat(500);
    const out = buildNotification({
      type: 'message',
      senderName: 'Sara',
      rfqId: 'r1',
      chatId: 'c1',
      preview: long,
    });
    expect((out.body ?? '').length).toBeLessThanOrEqual(120);
    expect((out.body ?? '').endsWith('…')).toBe(true);
  });

  it('preserves short previews untouched', () => {
    const out = buildNotification({
      type: 'message',
      senderName: 'Sara',
      rfqId: 'r1',
      chatId: 'c1',
      preview: 'مرحباً',
    });
    expect(out.body).toBe('مرحباً');
  });
});

describe('buildNotification — panic button', () => {
  it('truncates reason and includes RFQ number', () => {
    const out = buildNotification({
      type: 'panic_button',
      rfqNumber: 'RFQ-1',
      chatId: 'c1',
      reason: 'reason '.repeat(40),
    });
    expect(out.title).toContain('🚨');
    expect((out.body ?? '').length).toBeLessThanOrEqual(127); // body = "RFQ-1: " + truncated 120
  });

  it('points to admin dashboard', () => {
    const out = buildNotification({
      type: 'panic_button',
      rfqNumber: 'RFQ-1',
      chatId: 'c1',
      reason: 'urgent',
    });
    expect(out.link).toMatch(/\/admin$/);
  });
});

describe('notificationTypeOf', () => {
  it('returns the discriminator', () => {
    for (const args of ALL_TYPES) {
      expect(notificationTypeOf(args)).toBe(args.type);
    }
  });
});

describe('buildNotification — role-aware link routing (B-011)', () => {
  it('routes a supplier `message` to /supplier/chats/<chatId>', () => {
    const out = buildNotification(
      {
        type: 'message',
        senderName: 'Sara',
        rfqId: 'rfq-1',
        chatId: 'chat-1',
        preview: 'hello',
      },
      'ar',
      'supplier'
    );
    expect(out.link).toMatch(/\/ar\/supplier\/chats\/chat-1$/);
  });

  it('routes a client `message` to /dashboard/rfqs/<id>/chats/<chatId>', () => {
    const out = buildNotification(
      {
        type: 'message',
        senderName: 'Sara',
        rfqId: 'rfq-1',
        chatId: 'chat-1',
        preview: 'hello',
      },
      'ar',
      'client'
    );
    expect(out.link).toMatch(/\/ar\/dashboard\/rfqs\/rfq-1\/chats\/chat-1$/);
  });

  it('routes a supplier `agreement_pending` to /supplier/rfqs/<id> (no /agreement subpage on supplier side)', () => {
    const out = buildNotification(
      { type: 'agreement_pending', rfqNumber: 'RFQ-1', rfqId: 'rfq-1' },
      'ar',
      'supplier'
    );
    expect(out.link).toMatch(/\/ar\/supplier\/rfqs\/rfq-1$/);
    expect(out.link).not.toContain('/dashboard/');
  });

  it('routes a client `agreement_pending` to /dashboard/rfqs/<id>/agreement', () => {
    const out = buildNotification(
      { type: 'agreement_pending', rfqNumber: 'RFQ-1', rfqId: 'rfq-1' },
      'ar',
      'client'
    );
    expect(out.link).toMatch(/\/ar\/dashboard\/rfqs\/rfq-1\/agreement$/);
  });

  it('defaults to client routing when role is null/undefined (preserves old behaviour for callers that do not yet pass a role)', () => {
    const out = buildNotification(
      {
        type: 'message',
        senderName: 'Sara',
        rfqId: 'rfq-1',
        chatId: 'chat-1',
        preview: 'hello',
      },
      'ar'
    );
    expect(out.link).toMatch(/\/ar\/dashboard\/rfqs\/rfq-1\/chats\/chat-1$/);
  });
});

describe('buildNotification — recipient locale routing', () => {
  it('defaults to /ar prefix when no locale passed', () => {
    const out = buildNotification({
      type: 'rfq_match',
      rfqNumber: 'RFQ-1',
      rfqTitle: 'X',
      rfqId: 'r1',
    });
    expect(out.link).toMatch(/\/ar\/supplier\/rfqs\/r1$/);
  });

  it('uses /en prefix when recipient locale is en', () => {
    const out = buildNotification(
      { type: 'rfq_match', rfqNumber: 'RFQ-1', rfqTitle: 'X', rfqId: 'r1' },
      'en'
    );
    expect(out.link).toMatch(/\/en\/supplier\/rfqs\/r1$/);
  });

  it('falls back to /ar when locale is null/undefined/garbage', () => {
    for (const bad of [null, undefined, '', 'fr', 'es']) {
      const out = buildNotification(
        { type: 'rfq_match', rfqNumber: 'RFQ-1', rfqTitle: 'X', rfqId: 'r1' },
        bad
      );
      expect(out.link).toMatch(/\/ar\//);
    }
  });

  it('admin links never get a locale prefix (admin is locale-less)', () => {
    const out = buildNotification(
      { type: 'panic_button', rfqNumber: 'RFQ-1', chatId: 'c1', reason: 'urgent' },
      'en'
    );
    expect(out.link).toMatch(/\/admin$/);
    expect(out.link).not.toMatch(/\/en\//);
    expect(out.link).not.toMatch(/\/ar\//);
  });
});
