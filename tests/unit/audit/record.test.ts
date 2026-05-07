import { describe, it, expect, vi } from 'vitest';
import { recordAudit } from '@/lib/audit/record';

function fakeAdmin(insertImpl: (row: unknown) => Promise<{ error: { message?: string } | null }>) {
  return {
    from(_table: string) {
      return { insert: insertImpl };
    },
  };
}

describe('recordAudit — happy path', () => {
  it('writes the row with all fields', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const admin = fakeAdmin(insert);
    const ok = await recordAudit(admin, {
      actorId: 'usr-1',
      actorRole: 'client',
      action: 'rfq_created',
      resourceType: 'rfq',
      resourceId: 'rfq-1',
      metadata: { service: 'booth' },
      ipAddress: '1.2.3.4',
      userAgent: 'agent',
    });
    expect(ok).toBe(true);
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        actor_id: 'usr-1',
        actor_role: 'client',
        action: 'rfq_created',
        resource_type: 'rfq',
        resource_id: 'rfq-1',
        ip_address: '1.2.3.4',
        user_agent: 'agent',
      })
    );
  });

  it('defaults ip + user_agent to null when omitted', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    await recordAudit(fakeAdmin(insert), {
      actorId: 'usr-1',
      actorRole: 'admin',
      action: 'a',
      resourceType: 'x',
      resourceId: null,
    });
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ ip_address: null, user_agent: null })
    );
  });
});

describe('recordAudit — input validation', () => {
  it('returns false on empty action', async () => {
    const insert = vi.fn();
    const ok = await recordAudit(fakeAdmin(insert), {
      actorId: 'usr-1',
      actorRole: 'client',
      action: '',
      resourceType: 'rfq',
      resourceId: 'r',
    });
    expect(ok).toBe(false);
    expect(insert).not.toHaveBeenCalled();
  });

  it('returns false on empty resourceType', async () => {
    const insert = vi.fn();
    const ok = await recordAudit(fakeAdmin(insert), {
      actorId: 'usr-1',
      actorRole: 'client',
      action: 'thing',
      resourceType: '',
      resourceId: 'r',
    });
    expect(ok).toBe(false);
  });
});

describe('recordAudit — failure handling', () => {
  it('returns false when insert reports an error (and does not throw)', async () => {
    const insert = vi.fn().mockResolvedValue({
      error: { message: 'permission denied' },
    });
    const ok = await recordAudit(fakeAdmin(insert), {
      actorId: 'usr-1',
      actorRole: 'admin',
      action: 'foo',
      resourceType: 'bar',
      resourceId: null,
    });
    expect(ok).toBe(false);
  });

  it('returns false when insert throws (does not propagate)', async () => {
    const insert = vi.fn().mockRejectedValue(new Error('network'));
    const ok = await recordAudit(fakeAdmin(insert), {
      actorId: null,
      actorRole: null,
      action: 'foo',
      resourceType: 'bar',
      resourceId: null,
    });
    expect(ok).toBe(false);
  });
});
