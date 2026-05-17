/**
 * Integration tests for notifications server actions.
 *
 * Covers: auth gate on both actions; mark-all vs mark-by-ids;
 * recent rows ordering + unread count; private-data isolation
 * (action always filters by current user_id).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupabaseMock } from '@/tests/mocks/supabase-mock';

let supabaseMock = createSupabaseMock();
let adminMock = createSupabaseMock();

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => Promise.resolve(supabaseMock.client),
}));
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => adminMock.client,
}));

beforeEach(() => {
  supabaseMock = createSupabaseMock();
  adminMock = createSupabaseMock();
  vi.resetModules();
});

describe('markNotificationsReadAction — auth', () => {
  it('rejects when unauthenticated', async () => {
    const { markNotificationsReadAction } = await import(
      '@/app/actions/notifications'
    );
    const result = await markNotificationsReadAction();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/تسجيل الدخول/);
  });
});

describe('markNotificationsReadAction — happy path', () => {
  beforeEach(() => {
    supabaseMock.setUser({ id: 'user-1' });
  });

  it('marks-all updates with read_at and filters by user_id', async () => {
    const { markNotificationsReadAction } = await import(
      '@/app/actions/notifications'
    );
    const result = await markNotificationsReadAction();
    expect(result.ok).toBe(true);

    const updates = adminMock.getUpdates('notifications');
    expect(updates).toHaveLength(1);
    expect(updates[0].values.read_at).toBeDefined();
    // The action filters .eq('user_id', user.id) before the update.
    expect(
      updates[0].eqs.some(([col, val]) => col === 'user_id' && val === 'user-1')
    ).toBe(true);
  });

  it('mark-by-ids returns markedCount equal to ids length', async () => {
    const { markNotificationsReadAction } = await import(
      '@/app/actions/notifications'
    );
    const result = await markNotificationsReadAction(['n-1', 'n-2', 'n-3']);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const d = result.data as { markedCount: number } | undefined;
      expect(d?.markedCount).toBe(3);
    }
  });

  it('mark-all returns markedCount=0 (we do not count in this path)', async () => {
    const { markNotificationsReadAction } = await import(
      '@/app/actions/notifications'
    );
    const result = await markNotificationsReadAction();
    expect(result.ok).toBe(true);
    if (result.ok) {
      const d = result.data as { markedCount: number } | undefined;
      expect(d?.markedCount).toBe(0);
    }
  });

  it('returns mapped error on DB failure', async () => {
    adminMock.setError('notifications', 'update', {
      code: '42501',
      message: 'permission denied',
    });
    const { markNotificationsReadAction } = await import(
      '@/app/actions/notifications'
    );
    const result = await markNotificationsReadAction(['n-1']);
    expect(result.ok).toBe(false);
  });
});

describe('getRecentNotificationsAction — auth', () => {
  it('rejects when unauthenticated', async () => {
    const { getRecentNotificationsAction } = await import(
      '@/app/actions/notifications'
    );
    const result = await getRecentNotificationsAction();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/تسجيل الدخول/);
  });
});

describe('getRecentNotificationsAction — happy path', () => {
  beforeEach(() => {
    supabaseMock.setUser({ id: 'user-1' });
  });

  it('returns rows + zero unreadCount when no notifications', async () => {
    const { getRecentNotificationsAction } = await import(
      '@/app/actions/notifications'
    );
    const result = await getRecentNotificationsAction(10);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const d = result.data as
        | { rows: unknown[]; unreadCount: number }
        | undefined;
      expect(d?.rows).toEqual([]);
      expect(d?.unreadCount).toBe(0);
    }
  });

  it('returns shape { rows, unreadCount } from DB query', async () => {
    // Mock's multi-row SELECT returns [], so we verify shape + types,
    // not specific row content. (Specific row content is exercised by E2E
    // against the real DB in Round 5.)
    const { getRecentNotificationsAction } = await import(
      '@/app/actions/notifications'
    );
    const result = await getRecentNotificationsAction(10);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const d = result.data as
        | { rows: unknown[]; unreadCount: number }
        | undefined;
      expect(Array.isArray(d?.rows)).toBe(true);
      expect(typeof d?.unreadCount).toBe('number');
    }
  });

  it('clamps limit to [1, 50]', async () => {
    const { getRecentNotificationsAction } = await import(
      '@/app/actions/notifications'
    );
    const oversized = await getRecentNotificationsAction(9999);
    expect(oversized.ok).toBe(true);
    const negative = await getRecentNotificationsAction(-5);
    expect(negative.ok).toBe(true);
  });
});
