/**
 * Front-end analytics events for the UX Plan v2 rollout.
 *
 * Each binding decision in the plan has a measurable hypothesis (e.g. "AI
 * confidence raises user trust 62% → 80%"). We emit a typed event at every
 * decision point so we can compare cohorts post-launch.
 *
 * Transport: the reporter is swappable (see setAnalyticsReporter). The default
 * logs to console in dev and is a no-op in prod until a real reporter (PostHog
 * or Vercel Analytics) is wired in instrumentation-client.ts.
 *
 * Why a typed event union instead of a free-form `track(name, props)`: every
 * field appears in dashboards and survives schema migrations. Adding a new
 * event = one line in `AnalyticsEvent`; renaming a prop is a typecheck error,
 * not a silent dashboard breakage.
 */

import { log } from '@/lib/utils/logger';

export type AnalyticsEvent =
  | { name: 'rfq_created'; props: RfqCreatedProps }
  | { name: 'ai_confidence_viewed'; props: AiConfidenceViewedProps }
  | { name: 'ai_disagreed'; props: AiDisagreedProps }
  | { name: 'ai_override_applied'; props: AiOverrideAppliedProps }
  | { name: 'escrow_payment_completed'; props: EscrowPaymentCompletedProps }
  | { name: 'cultural_toggle_changed'; props: CulturalToggleChangedProps }
  | { name: 'failure_recovery_triggered'; props: FailureRecoveryTriggeredProps }
  | { name: 'milestone_celebrated'; props: MilestoneCelebratedProps }
  | { name: 'trust_layer_viewed'; props: TrustLayerViewedProps }
  | { name: 'concierge_message_shown'; props: ConciergeMessageShownProps }
  | { name: 'ab_assignment'; props: AbAssignmentProps };

export interface RfqCreatedProps {
  rfqId: string;
  variant: 'wizard' | 'single_screen';
  completionTimeMs: number;
  sectionsOpened: number;
  usedSmartDefaults: boolean;
}

export interface AiConfidenceViewedProps {
  proposalId: string;
  level: 'high' | 'medium' | 'low' | 'unknown';
  sampleSize: number;
}

export interface AiDisagreedProps {
  proposalId: string;
  reason: 'price_too_high' | 'price_too_low' | 'illogical';
  comment?: string;
}

export interface AiOverrideAppliedProps {
  feature: 'eye_of_market' | 'proposal_score' | 'contract_summary';
  proposalId?: string;
}

export interface EscrowPaymentCompletedProps {
  rfqId: string;
  amountSar: number;
  amanahNamingShown: boolean;
}

export interface CulturalToggleChangedProps {
  setting: 'hijri' | 'numerals' | 'prayer_times';
  to: string;
}

export interface FailureRecoveryTriggeredProps {
  scenario:
    | 'escrow_transfer_failed'
    | 'ai_no_recommendation'
    | 'supplier_no_response'
    | 'zatca_pending'
    | 'cancellation_requested'
    | 'fake_review_quarantine'
    | 'rfq_leaked_offplatform'
    | 'dispute_no_evidence'
    | 'emergency_shutdown'
    | 'supplier_postponement'
    | 'notification_unread'
    | 'password_forgotten';
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface MilestoneCelebratedProps {
  milestone:
    | 'first_rfq'
    | 'first_proposal_received'
    | 'first_chat_opened'
    | 'first_agreement_signed'
    | 'first_escrow_funded'
    | 'first_project_completed'
    | 'first_deal'
    | '100k_gmv'
    | '500k_gmv'
    | '1m_gmv'
    | 'yearly_anniversary';
  withConfetti: boolean;
}

export interface TrustLayerViewedProps {
  layer: 'identity' | 'process' | 'outcome' | 'emotional';
  context: 'supplier_profile' | 'compare' | 'escrow' | 'project';
}

export interface ConciergeMessageShownProps {
  surface: 'dashboard' | 'rfq_success' | 'supplier_profile';
}

export interface AbAssignmentProps {
  experimentKey: string;
  variant: 'A' | 'B';
}

export interface AnalyticsReporter {
  report(event: AnalyticsEvent): void;
}

const consoleReporter: AnalyticsReporter = {
  report(event) {
    log.info(`analytics.${event.name}`, { props: event.props });
  },
};

let activeReporter: AnalyticsReporter = consoleReporter;

/**
 * Wire in a real reporter (PostHog/Vercel) at process boot. Calling without
 * a reporter resets to console.
 */
export function setAnalyticsReporter(reporter?: AnalyticsReporter): void {
  activeReporter = reporter ?? consoleReporter;
}

/**
 * Emit a typed analytics event. Safe to call from server or client code;
 * the reporter decides where it lands.
 */
export function trackEvent(event: AnalyticsEvent): void {
  try {
    activeReporter.report(event);
  } catch (err) {
    log.error('analytics.report_failed', err, { event: event.name });
  }
}
