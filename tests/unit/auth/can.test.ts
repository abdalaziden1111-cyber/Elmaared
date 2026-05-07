import { describe, it, expect } from 'vitest';
import {
  canPerformAction,
  rolesAllowedFor,
  actionsAllowedFor,
  type AppAction,
} from '@/lib/auth/can';

describe('canPerformAction — happy paths', () => {
  it('client can create RFQ', () => {
    expect(canPerformAction('client', 'rfq.create')).toBe(true);
  });
  it('supplier can submit proposal', () => {
    expect(canPerformAction('supplier', 'proposal.submit')).toBe(true);
  });
  it('admin can confirm initial deposit', () => {
    expect(canPerformAction('admin', 'escrow.confirm_initial_deposit')).toBe(true);
  });
  it('admin can resolve dispute', () => {
    expect(canPerformAction('admin', 'dispute.resolve')).toBe(true);
  });
  it('client can approve delivery', () => {
    expect(canPerformAction('client', 'delivery.approve')).toBe(true);
  });
  it('admin can also approve delivery (override)', () => {
    expect(canPerformAction('admin', 'delivery.approve')).toBe(true);
  });
  it('all 3 roles can send chat messages', () => {
    expect(canPerformAction('client', 'chat.send_message')).toBe(true);
    expect(canPerformAction('supplier', 'chat.send_message')).toBe(true);
    expect(canPerformAction('admin', 'chat.send_message')).toBe(true);
  });
});

describe('canPerformAction — denials', () => {
  it('supplier cannot create RFQ', () => {
    expect(canPerformAction('supplier', 'rfq.create')).toBe(false);
  });
  it('client cannot submit proposal', () => {
    expect(canPerformAction('client', 'proposal.submit')).toBe(false);
  });
  it('client cannot resolve dispute', () => {
    expect(canPerformAction('client', 'dispute.resolve')).toBe(false);
  });
  it('supplier cannot release escrow', () => {
    expect(canPerformAction('supplier', 'escrow.release_to_supplier')).toBe(false);
  });
  it('admin cannot raise panic (admins join, not panic)', () => {
    expect(canPerformAction('admin', 'chat.raise_panic')).toBe(false);
  });
  it('client cannot submit delivery', () => {
    expect(canPerformAction('client', 'delivery.submit')).toBe(false);
  });
});

describe('canPerformAction — invalid inputs', () => {
  it('returns false for null role', () => {
    expect(canPerformAction(null, 'rfq.create')).toBe(false);
  });
  it('returns false for undefined role', () => {
    expect(canPerformAction(undefined, 'rfq.create')).toBe(false);
  });
});

describe('rolesAllowedFor', () => {
  it('returns the role list for an action', () => {
    expect(rolesAllowedFor('proposal.submit')).toEqual(['supplier']);
    expect(rolesAllowedFor('chat.send_message').length).toBe(3);
  });
  it('returns empty for unknown action', () => {
    expect(rolesAllowedFor('not.real' as AppAction)).toEqual([]);
  });
});

describe('actionsAllowedFor', () => {
  it('admin can resolve dispute and approve supplier', () => {
    const actions = actionsAllowedFor('admin');
    expect(actions).toContain('dispute.resolve');
    expect(actions).toContain('supplier.approve');
    expect(actions).toContain('escrow.release_to_supplier');
  });

  it('client cannot do supplier.approve', () => {
    expect(actionsAllowedFor('client')).not.toContain('supplier.approve');
  });

  it('supplier list excludes client-only actions', () => {
    const actions = actionsAllowedFor('supplier');
    expect(actions).not.toContain('rfq.create');
    expect(actions).not.toContain('proposal.shortlist');
    expect(actions).toContain('proposal.submit');
    expect(actions).toContain('delivery.submit');
  });

  it('every role gets at least one action', () => {
    expect(actionsAllowedFor('client').length).toBeGreaterThan(0);
    expect(actionsAllowedFor('supplier').length).toBeGreaterThan(0);
    expect(actionsAllowedFor('admin').length).toBeGreaterThan(0);
  });
});

describe('full role × action matrix sanity', () => {
  // The matrix is defined explicitly per action — verify each entry
  // doesn't accidentally permit empty arrays (would silently lock out all roles).
  const allActions: AppAction[] = [
    'rfq.create',
    'rfq.publish',
    'rfq.award',
    'rfq.cancel',
    'proposal.submit',
    'proposal.shortlist',
    'chat.send_message',
    'chat.raise_panic',
    'chat.admin_join',
    'agreement.submit_understanding',
    'agreement.sign',
    'escrow.upload_initial_receipt',
    'escrow.confirm_initial_deposit',
    'delivery.submit',
    'delivery.approve',
    'escrow.release_to_supplier',
    'review.submit',
    'dispute.open',
    'dispute.resolve',
    'supplier.approve',
    'supplier.reject',
  ];

  it.each(allActions)('action %s is permitted to at least one role', (action) => {
    const roles = rolesAllowedFor(action);
    expect(roles.length).toBeGreaterThan(0);
  });
});
