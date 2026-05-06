import { describe, it, expect } from 'vitest';
import {
  mapPostgresError,
  isDuplicateError,
} from '@/lib/utils/postgres-errors';

describe('mapPostgresError — code routing', () => {
  it('handles 23505 unique violation', () => {
    const r = mapPostgresError({ code: '23505', message: 'duplicate' });
    expect(r.kind).toBe('duplicate');
  });

  it('handles 23503 FK violation', () => {
    const r = mapPostgresError({ code: '23503', message: 'fk' });
    expect(r.kind).toBe('fk_violation');
  });

  it('handles 23502 not-null violation', () => {
    const r = mapPostgresError({ code: '23502', message: 'null' });
    expect(r.kind).toBe('not_null_violation');
  });

  it('handles 23514 check violation', () => {
    const r = mapPostgresError({ code: '23514', message: 'check' });
    expect(r.kind).toBe('check_violation');
  });

  it('handles 42501 permission denied', () => {
    const r = mapPostgresError({ code: '42501', message: 'rls' });
    expect(r.kind).toBe('permission_denied');
  });

  it('handles 40001/40P01 serialization failures', () => {
    expect(mapPostgresError({ code: '40001' }).kind).toBe('serialization');
    expect(mapPostgresError({ code: '40P01' }).kind).toBe('serialization');
  });

  it('handles 08000-class connection errors', () => {
    expect(mapPostgresError({ code: '08000' }).kind).toBe('connection');
    expect(mapPostgresError({ code: '08003' }).kind).toBe('connection');
    expect(mapPostgresError({ code: '08006' }).kind).toBe('connection');
  });

  it('falls back to unknown for unrecognized codes', () => {
    expect(mapPostgresError({ code: 'P0001' }).kind).toBe('unknown');
    expect(mapPostgresError({ code: '99999' }).kind).toBe('unknown');
  });
});

describe('mapPostgresError — non-PG inputs', () => {
  it('handles null / undefined', () => {
    expect(mapPostgresError(null).kind).toBe('unknown');
    expect(mapPostgresError(undefined).kind).toBe('unknown');
  });

  it('handles plain string error', () => {
    const r = mapPostgresError('something blew up');
    expect(r.kind).toBe('unknown');
    expect(r.technical).toBe('something blew up');
  });

  it('handles Error instance without .code', () => {
    const r = mapPostgresError(new Error('boom'));
    expect(r.kind).toBe('unknown');
    expect(r.technical).toBe('boom');
  });

  it('handles object without .code', () => {
    const r = mapPostgresError({ message: 'huh' });
    expect(r.kind).toBe('unknown');
  });
});

describe('mapPostgresError — duplicate-message refinement', () => {
  it('refines for cr_number duplicates', () => {
    const r = mapPostgresError({
      code: '23505',
      message: 'duplicate key value violates unique constraint "companies_cr_number_key"',
    });
    expect(r.messageAr).toContain('السجل التجاري');
  });

  it('refines for email duplicates', () => {
    const r = mapPostgresError({
      code: '23505',
      message: 'duplicate key value violates email_unique',
    });
    expect(r.messageAr).toContain('البريد');
  });

  it('refines for proposal-per-RFQ duplicates', () => {
    const r = mapPostgresError({
      code: '23505',
      message: 'unique violation on proposals_rfq_id_supplier_id_key',
    });
    expect(r.messageAr).toContain('عرضاً');
  });

  it('refines for review-per-RFQ duplicates', () => {
    const r = mapPostgresError({
      code: '23505',
      message: 'unique violation on reviews_rfq_id_key',
    });
    expect(r.messageAr).toContain('قيّمت');
  });

  it('refines for chat-per-RFQ duplicates', () => {
    const r = mapPostgresError({
      code: '23505',
      message: 'unique violation on chats_rfq_id_supplier_id_key',
    });
    expect(r.messageAr).toContain('محادثة');
  });

  it('uses context when message has no clear hint', () => {
    const r = mapPostgresError({ code: '23505', message: 'some other constraint' }, 'الموردين');
    expect(r.messageAr).toContain('الموردين');
  });

  it('falls back to generic message when neither hint nor context available', () => {
    const r = mapPostgresError({ code: '23505', message: 'some other constraint' });
    expect(r.messageAr).toBe('هذا العنصر موجود بالفعل.');
  });
});

describe('isDuplicateError', () => {
  it('returns true for PG 23505', () => {
    expect(isDuplicateError({ code: '23505' })).toBe(true);
  });

  it('returns false for non-duplicate errors', () => {
    expect(isDuplicateError({ code: '23503' })).toBe(false);
    expect(isDuplicateError(null)).toBe(false);
    expect(isDuplicateError(new Error('boom'))).toBe(false);
  });
});
