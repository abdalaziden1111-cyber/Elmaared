// Phase V4.2 — dispatchNotification: prefs honored, quiet hours respected,
// email opt-out skips fanout but in-app still lands.

import { describe, it, expect, vi, beforeEach } from 'vitest';

const sendEmailMock = vi.fn().mockResolvedValue({ id: 'eml-1', skipped: false });
const inserted: Array<Record<string, unknown>> = [];

vi.mock('@/lib/email/resend', () => ({
  sendEmail: (...args: unknown[]) => sendEmailMock(...args),
}));

interface PrefsShape {
  email_disabled_types: string[];
  in_app_disabled_types: string[];
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  digest_frequency: 'off' | 'daily' | 'weekly';
}

const PREFS_DEFAULT: PrefsShape = {
  email_disabled_types: [],
  in_app_disabled_types: [],
  quiet_hours_start: null,
  quiet_hours_end: null,
  digest_frequency: 'off',
};

let prefs: PrefsShape | null = PREFS_DEFAULT;
let profileLocale = 'ar';
let userEmail: string | null = 'user@example.com';

function makeAdmin() {
  return {
    from(table: string) {
      if (table === 'notification_preferences') {
        return {
          select() { return this; },
          eq() { return this; },
          maybeSingle() { return Promise.resolve({ data: prefs }); },
        };
      }
      if (table === 'profiles') {
        return {
          select() { return this; },
          eq() { return this; },
          maybeSingle() {
            return Promise.resolve({
              data: { preferred_language: profileLocale },
            });
          },
        };
      }
      if (table === 'notifications') {
        return {
          insert(row: Record<string, unknown>) {
            inserted.push(row);
            return Promise.resolve({ error: null });
          },
          update() {
            return {
              eq() { return this; },
              order() { return this; },
              limit() { return Promise.resolve({ error: null }); },
            };
          },
        };
      }
      return { select() { return this; }, eq() { return this; } };
    },
    auth: {
      admin: {
        getUserById: () =>
          Promise.resolve({ data: { user: userEmail ? { email: userEmail } : null } }),
      },
    },
  } as unknown as Parameters<typeof import('@/lib/notifications/dispatch').dispatchNotification>[0]['admin'] & object;
}

beforeEach(() => {
  sendEmailMock.mockClear();
  inserted.length = 0;
  prefs = { ...PREFS_DEFAULT };
  profileLocale = 'ar';
  userEmail = 'user@example.com';
});

describe('dispatchNotification', () => {
  it('default prefs: inserts in-app + sends email', async () => {
    const { dispatchNotification } = await import('@/lib/notifications/dispatch');
    await dispatchNotification({
      userId: 'u1',
      args: { type: 'proposal_received', rfqNumber: 'R-1', supplierName: 'Sup', rfqId: 'rfq-1' },
      admin: makeAdmin(),
    });
    expect(inserted.length).toBe(1);
    expect(inserted[0].type).toBe('proposal_received');
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
  });

  it('in-app opt-out: skips insert but still emails', async () => {
    prefs = { ...PREFS_DEFAULT, in_app_disabled_types: ['proposal_received'] };
    const { dispatchNotification } = await import('@/lib/notifications/dispatch');
    await dispatchNotification({
      userId: 'u1',
      args: { type: 'proposal_received', rfqNumber: 'R-1', supplierName: 'Sup', rfqId: 'rfq-1' },
      admin: makeAdmin(),
    });
    expect(inserted.length).toBe(0);
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
  });

  it('email opt-out: inserts in-app, skips email', async () => {
    prefs = { ...PREFS_DEFAULT, email_disabled_types: ['proposal_received'] };
    const { dispatchNotification } = await import('@/lib/notifications/dispatch');
    await dispatchNotification({
      userId: 'u1',
      args: { type: 'proposal_received', rfqNumber: 'R-1', supplierName: 'Sup', rfqId: 'rfq-1' },
      admin: makeAdmin(),
    });
    expect(inserted.length).toBe(1);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it('digest mode: in-app fires, email batched out', async () => {
    prefs = { ...PREFS_DEFAULT, digest_frequency: 'daily' };
    const { dispatchNotification } = await import('@/lib/notifications/dispatch');
    await dispatchNotification({
      userId: 'u1',
      args: { type: 'proposal_received', rfqNumber: 'R-1', supplierName: 'Sup', rfqId: 'rfq-1' },
      admin: makeAdmin(),
    });
    expect(inserted.length).toBe(1);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it('email skipped when recipient has no email on file', async () => {
    userEmail = null;
    const { dispatchNotification } = await import('@/lib/notifications/dispatch');
    await dispatchNotification({
      userId: 'u1',
      args: { type: 'proposal_received', rfqNumber: 'R-1', supplierName: 'Sup', rfqId: 'rfq-1' },
      admin: makeAdmin(),
    });
    expect(inserted.length).toBe(1);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });
});

describe('quiet-hours helper (inQuietHours)', () => {
  it('returns false when not configured', async () => {
    const { __testing } = await import('@/lib/notifications/dispatch');
    expect(__testing.inQuietHours(null, '07:00', new Date())).toBe(false);
    expect(__testing.inQuietHours('22:00', null, new Date())).toBe(false);
  });

  it('returns true when current UTC time falls inside the window', async () => {
    const { __testing } = await import('@/lib/notifications/dispatch');
    const noon = new Date(Date.UTC(2026, 0, 1, 12, 0, 0));
    expect(__testing.inQuietHours('10:00', '14:00', noon)).toBe(true);
    expect(__testing.inQuietHours('14:00', '18:00', noon)).toBe(false);
  });

  it('handles the wrap-midnight case', async () => {
    const { __testing } = await import('@/lib/notifications/dispatch');
    const oneAM = new Date(Date.UTC(2026, 0, 1, 1, 0, 0));
    const elevenPM = new Date(Date.UTC(2026, 0, 1, 23, 0, 0));
    const noon = new Date(Date.UTC(2026, 0, 1, 12, 0, 0));
    expect(__testing.inQuietHours('22:00', '07:00', oneAM)).toBe(true);
    expect(__testing.inQuietHours('22:00', '07:00', elevenPM)).toBe(true);
    expect(__testing.inQuietHours('22:00', '07:00', noon)).toBe(false);
  });

  it('returns false when start == end (zero-length window)', async () => {
    const { __testing } = await import('@/lib/notifications/dispatch');
    expect(
      __testing.inQuietHours('12:00', '12:00', new Date(Date.UTC(2026, 0, 1, 12, 0, 0)))
    ).toBe(false);
  });
});
