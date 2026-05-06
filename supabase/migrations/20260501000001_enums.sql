-- ======================================
-- 1. ENUMS — All type definitions
-- ======================================

CREATE TYPE user_role AS ENUM ('admin', 'client', 'supplier');

CREATE TYPE service_type AS ENUM (
  'booth',
  'gifts',
  'event',
  'printing'
);

CREATE TYPE supplier_status AS ENUM (
  'pending_review',
  'approved',
  'inactive',
  'suspended',
  'rejected'
);

CREATE TYPE rfq_status AS ENUM (
  'draft',
  'open',
  'negotiating',
  'awarded',
  'in_escrow',
  'in_progress',
  'delivered',
  'completed',
  'disputed',
  'cancelled'
);

CREATE TYPE proposal_status AS ENUM (
  'submitted',
  'under_review',
  'shortlisted',
  'accepted',
  'rejected',
  'withdrawn'
);

CREATE TYPE escrow_status AS ENUM (
  'awaiting_deposit',
  'deposit_received',
  'work_in_progress',
  'delivered',
  'final_payment',
  'released',
  'refunded',
  'partial_refund'
);

CREATE TYPE notification_type AS ENUM (
  'rfq_new', 'rfq_match', 'proposal_received', 'proposal_shortlisted',
  'proposal_accepted', 'proposal_rejected', 'agreement_pending',
  'escrow_deposit_required', 'escrow_received', 'work_started',
  'delivery_pending', 'delivery_approved', 'panic_button',
  'message', 'system'
);

CREATE TYPE escrow_event_type AS ENUM (
  'deposit_initiated',
  'deposit_receipt_uploaded',
  'deposit_confirmed',
  'work_started',
  'delivery_submitted',
  'delivery_approved',
  'final_payment_initiated',
  'final_payment_confirmed',
  'released_to_supplier',
  'invoice_issued',
  'dispute_opened',
  'partial_refund_issued',
  'full_refund_issued'
);
