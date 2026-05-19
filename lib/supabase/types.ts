// Hand-authored Database types matching the migration files. When a real
// Supabase instance is available, regenerate via:
//   pnpm dlx supabase gen types typescript --local > lib/supabase/types.ts
// Until then this stays in sync with supabase/migrations/*.sql by inspection.
//
// Why hand-author? Because `Record<string, any>` placeholders silently
// accept misspelled columns — which is exactly the class of bug that bites
// you on the first DB roundtrip in prod. Even an approximate type that
// names every column gives the compiler something to enforce.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type UserRole = 'admin' | 'client' | 'supplier';
type ServiceType = 'booth' | 'gifts' | 'event' | 'printing';
type SupplierStatus =
  | 'pending_review'
  | 'approved'
  | 'inactive'
  | 'suspended'
  | 'rejected';
type RfqStatus =
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
type ProposalStatus =
  | 'submitted'
  | 'under_review'
  | 'shortlisted'
  | 'accepted'
  | 'rejected'
  | 'withdrawn';
// UX Plan v2 Decision #01 — AI Confidence Framework (Sprint 1 S1.1).
// 4 buckets matching the visual badges 🟢🔵🟡⚪. See lib/ai/confidence.ts
// for the derivation rules.
export type AiConfidenceLevel = 'high' | 'medium' | 'low' | 'unknown';
// UX Plan v2 Decision #01 — user pushback bucket (Sprint 1 S1.4).
export type AiFeedbackReason = 'price_too_high' | 'price_too_low' | 'illogical';
type EscrowStatus =
  | 'awaiting_deposit'
  | 'deposit_received'
  | 'work_in_progress'
  | 'delivered'
  | 'final_payment'
  | 'released'
  | 'refunded'
  | 'partial_refund';
type NotificationType =
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
type EscrowEventType =
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

// Helper that builds the {Row, Insert, Update} triplet from a single Row shape.
// Insert mirrors Row but makes every field optional (DB defaults fill in id +
// timestamps). Update mirrors Row but makes every field optional (partial patch).
type RowToTable<TRow> = {
  Row: TRow;
  Insert: { [K in keyof TRow]?: TRow[K] | null };
  Update: { [K in keyof TRow]?: TRow[K] | null };
};

interface ProfileRow {
  id: string;
  role: UserRole;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  preferred_language: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface CompanyRow {
  id: string;
  owner_id: string;
  name: string;
  legal_name: string | null;
  cr_number: string | null;
  vat_number: string | null;
  size: string | null;
  industry: string | null;
  city: string | null;
  address: string | null;
  logo_url: string | null;
  ceo_email: string | null;
  ceo_email_verified: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface SupplierRow {
  id: string;
  owner_id: string;
  company_name: string;
  legal_name: string | null;
  cr_number: string;
  vat_number: string | null;
  status: SupplierStatus;
  specializations: ServiceType[];
  cities: string[];
  bio: string | null;
  website: string | null;
  team_size: number | null;
  years_of_experience: number | null;
  min_order_value: number | null;
  cr_document_url: string | null;
  vat_document_url: string | null;
  portfolio_pdf_url: string | null;
  total_completed_orders: number;
  average_rating: number | null;
  on_time_delivery_rate: number | null;
  bank_name: string | null;
  iban: string | null;
  account_holder_name: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface SupplierPortfolioRow {
  id: string;
  supplier_id: string;
  title: string;
  description: string | null;
  service_type: ServiceType | null;
  client_name: string | null;
  exhibition_name: string | null;
  year: number | null;
  cover_image_url: string | null;
  images: string[];
  display_order: number;
  created_at: string;
  updated_at: string;
}

interface RfqRow {
  id: string;
  rfq_number: string;
  client_id: string;
  company_id: string;
  service_type: ServiceType;
  title: string;
  description: string | null;
  details: Record<string, unknown>;
  attachments: string[];
  logo_url: string | null;
  exhibition_name: string | null;
  exhibition_city: string | null;
  exhibition_date: string | null;
  delivery_location: string | null;
  budget_min: number | null;
  budget_max: number | null;
  proposals_deadline: string | null;
  status: RfqStatus;
  winning_proposal_id: string | null;
  awarded_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface ProposalRow {
  id: string;
  rfq_id: string;
  supplier_id: string;
  total_price: number;
  currency: string;
  delivery_days: number;
  delivery_date: string | null;
  description: string | null;
  scope_of_work: string | null;
  excluded_items: string | null;
  payment_terms: string | null;
  validity_days: number;
  proposal_pdf_url: string | null;
  attachments: string[];
  ai_score: number | null;
  ai_summary: string | null;
  ai_strengths: string[] | null;
  ai_concerns: string[] | null;
  // UX Plan v2 Decision #01 — market-quality metadata (Sprint 1 S1.1).
  ai_confidence: AiConfidenceLevel | null;
  ai_sample_size: number | null;
  ai_variance_pct: number | null;
  ai_price_range_min: number | null;
  ai_price_range_max: number | null;
  status: ProposalStatus;
  created_at: string;
  updated_at: string;
}

interface ChatRow {
  id: string;
  rfq_id: string;
  client_id: string;
  supplier_id: string;
  last_message_text: string | null;
  last_message_at: string | null;
  last_message_sender_id: string | null;
  client_unread_count: number;
  supplier_unread_count: number;
  admin_unread_count: number;
  is_archived: boolean;
  admin_joined_at: string | null;
  panic_at: string | null;
  panic_reason: string | null;
  created_at: string;
  updated_at: string;
}

interface MessageRow {
  id: string;
  chat_id: string;
  sender_id: string;
  sender_role: UserRole;
  content: string | null;
  attachment_url: string | null;
  attachment_type: string | null;
  attachment_name: string | null;
  attachment_size_bytes: number | null;
  is_admin_intervention: boolean | null;
  is_panic_alert: boolean | null;
  panic_reason: string | null;
  read_by_client_at: string | null;
  read_by_supplier_at: string | null;
  read_by_admin_at: string | null;
  created_at: string;
}

interface AgreementRow {
  id: string;
  rfq_id: string;
  proposal_id: string;
  client_id: string;
  supplier_id: string;
  client_understanding: string;
  supplier_understanding: string;
  client_submitted_at: string | null;
  supplier_submitted_at: string | null;
  ai_agreed_points: Json | null;
  ai_disputed_points: Json | null;
  ai_missing_points: Json | null;
  ai_recommendation: string | null;
  final_text: string | null;
  final_terms: Json | null;
  client_approved_at: string | null;
  supplier_approved_at: string | null;
  admin_approved_by: string | null;
  admin_approved_at: string | null;
  client_signature_hash: string | null;
  supplier_signature_hash: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface AgreementRevisionRow {
  id: string;
  agreement_id: string;
  revision_number: number;
  source: string;
  content: string;
  metadata: Json;
  authored_by: string | null;
  authored_role: UserRole | null;
  created_at: string;
}

interface EscrowTransactionRow {
  id: string;
  agreement_id: string;
  rfq_id: string;
  total_amount: number;
  initial_deposit: number;
  final_payment: number;
  client_fee: number;
  supplier_fee: number;
  platform_revenue: number;
  supplier_net: number;
  vat_rate_applied: number;
  client_fee_vat: number;
  supplier_fee_vat: number;
  total_vat: number;
  status: EscrowStatus;
  initial_deposit_receipt_url: string | null;
  initial_deposit_received_at: string | null;
  initial_deposit_confirmed_by: string | null;
  final_payment_receipt_url: string | null;
  final_payment_received_at: string | null;
  final_payment_confirmed_by: string | null;
  released_at: string | null;
  released_by: string | null;
  release_transaction_ref: string | null;
  refund_amount: number | null;
  refunded_at: string | null;
  refund_reason: string | null;
  created_at: string;
  updated_at: string;
}

interface EscrowEventRow {
  id: string;
  escrow_id: string;
  rfq_id: string;
  event_type: EscrowEventType;
  amount: number | null;
  balance_after: number | null;
  bank_reference: string | null;
  receipt_url: string | null;
  actor_id: string | null;
  actor_role: UserRole | null;
  metadata: Json;
  notes: string | null;
  created_at: string;
}

interface InvoiceRow {
  id: string;
  invoice_number: string;
  escrow_id: string;
  rfq_id: string;
  company_id: string;
  service_amount: number;
  platform_commission: number;
  vat_amount: number;
  total_invoiced: number;
  buyer_name: string;
  buyer_vat_number: string | null;
  buyer_cr_number: string | null;
  buyer_address: string | null;
  zatca_uuid: string | null;
  zatca_invoice_hash: string | null;
  zatca_qr_code: string | null;
  pdf_url: string | null;
  issued_at: string;
  created_at: string;
  updated_at: string;
}

interface DeliveryRow {
  id: string;
  rfq_id: string;
  agreement_id: string;
  supplier_id: string;
  delivery_notes: string | null;
  delivery_photos: string[];
  delivery_video_url: string | null;
  delivered_at: string | null;
  client_approved: boolean | null;
  client_approved_at: string | null;
  client_approval_notes: string | null;
  client_rejected_at: string | null;
  client_rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

interface DisputeRow {
  id: string;
  rfq_id: string;
  raised_by: string;
  raised_by_role: UserRole;
  category: string;
  description: string;
  evidence_urls: string[];
  assigned_admin_id: string | null;
  status: string;
  resolution: string | null;
  resolution_in_favor_of: string | null;
  refund_decision: number | null;
  field_visit_required: boolean;
  field_visit_at: string | null;
  field_visit_notes: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
}

interface ReviewRow {
  id: string;
  rfq_id: string;
  client_id: string;
  supplier_id: string;
  rating_overall: number;
  rating_quality: number | null;
  rating_timeliness: number | null;
  rating_communication: number | null;
  rating_flexibility: number | null;
  rating_price_value: number | null;
  comment: string | null;
  is_public: boolean;
  supplier_response: string | null;
  supplier_response_at: string | null;
  created_at: string;
  updated_at: string;
}

interface NotificationRow {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  rfq_id: string | null;
  proposal_id: string | null;
  chat_id: string | null;
  sent_email: boolean;
  sent_push: boolean;
  read_at: string | null;
  created_at: string;
}

interface AuditLogRow {
  id: string;
  actor_id: string | null;
  actor_role: UserRole | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  metadata: Json | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

interface AiFeedbackRow {
  id: string;
  proposal_id: string;
  user_id: string;
  reason: AiFeedbackReason;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

interface CeoAccessRow {
  id: string;
  company_id: string;
  ceo_email: string;
  verification_token: string | null;
  verified_at: string | null;
  is_active: boolean;
  invited_by: string | null;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: RowToTable<ProfileRow>;
      companies: RowToTable<CompanyRow>;
      suppliers: RowToTable<SupplierRow>;
      supplier_portfolio: RowToTable<SupplierPortfolioRow>;
      rfqs: RowToTable<RfqRow>;
      proposals: RowToTable<ProposalRow>;
      chats: RowToTable<ChatRow>;
      messages: RowToTable<MessageRow>;
      agreements: RowToTable<AgreementRow>;
      agreement_revisions: RowToTable<AgreementRevisionRow>;
      escrow_transactions: RowToTable<EscrowTransactionRow>;
      escrow_events: RowToTable<EscrowEventRow>;
      invoices: RowToTable<InvoiceRow>;
      deliveries: RowToTable<DeliveryRow>;
      disputes: RowToTable<DisputeRow>;
      reviews: RowToTable<ReviewRow>;
      notifications: RowToTable<NotificationRow>;
      audit_logs: RowToTable<AuditLogRow>;
      ceo_access: RowToTable<CeoAccessRow>;
      ai_feedback: RowToTable<AiFeedbackRow>;
    };
    Views: {
      active_rfqs: { Row: RfqRow };
      active_suppliers: { Row: SupplierRow };
    };
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      service_type: ServiceType;
      supplier_status: SupplierStatus;
      rfq_status: RfqStatus;
      proposal_status: ProposalStatus;
      escrow_status: EscrowStatus;
      notification_type: NotificationType;
      escrow_event_type: EscrowEventType;
      ai_confidence_level: AiConfidenceLevel;
      ai_feedback_reason: AiFeedbackReason;
    };
  };
}
