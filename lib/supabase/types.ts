export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Placeholder types — replace by running:
// pnpm dlx supabase gen types typescript --local > lib/supabase/types.ts
// after a working local Supabase instance is up.
//
// Until then, Row/Insert/Update accept `any` so server-action code
// (which knows the real shape) compiles. Replace with generated types
// to enforce per-column safety end-to-end.
/* eslint-disable @typescript-eslint/no-explicit-any */
export interface Database {
  public: {
    Tables: {
      [key: string]: {
        Row: Record<string, any>;
        Insert: Record<string, any>;
        Update: Record<string, any>;
      };
    };
    Views: {
      [key: string]: {
        Row: Record<string, any>;
      };
    };
    Functions: {
      [key: string]: {
        Args: Record<string, any>;
        Returns: any;
      };
    };
    Enums: {
      user_role: 'admin' | 'client' | 'supplier';
      service_type: 'booth' | 'gifts' | 'event' | 'printing';
      supplier_status:
        | 'pending_review'
        | 'approved'
        | 'inactive'
        | 'suspended'
        | 'rejected';
      rfq_status:
        | 'draft'
        | 'open'
        | 'negotiating'
        | 'awarded'
        | 'in_escrow'
        | 'in_progress'
        | 'delivered'
        | 'completed'
        | 'disputed'
        | 'cancelled';
      proposal_status:
        | 'submitted'
        | 'under_review'
        | 'shortlisted'
        | 'accepted'
        | 'rejected'
        | 'withdrawn';
      escrow_status:
        | 'awaiting_deposit'
        | 'deposit_received'
        | 'work_in_progress'
        | 'delivered'
        | 'final_payment'
        | 'released'
        | 'refunded'
        | 'partial_refund';
      notification_type:
        | 'rfq_new'
        | 'rfq_match'
        | 'proposal_received'
        | 'proposal_shortlisted'
        | 'proposal_accepted'
        | 'proposal_rejected'
        | 'agreement_pending'
        | 'escrow_deposit_required'
        | 'escrow_received'
        | 'work_started'
        | 'delivery_pending'
        | 'delivery_approved'
        | 'panic_button'
        | 'message'
        | 'system';
      escrow_event_type:
        | 'deposit_initiated'
        | 'deposit_receipt_uploaded'
        | 'deposit_confirmed'
        | 'work_started'
        | 'delivery_submitted'
        | 'delivery_approved'
        | 'final_payment_initiated'
        | 'final_payment_confirmed'
        | 'released_to_supplier'
        | 'invoice_issued'
        | 'dispute_opened'
        | 'partial_refund_issued'
        | 'full_refund_issued';
    };
  };
}
