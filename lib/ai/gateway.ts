import { gateway } from 'ai';

// Vercel AI Gateway — auto-detects auth in this priority order:
//   1. VERCEL_OIDC_TOKEN (set automatically on Vercel; pulled locally via
//      `vercel env pull .env.local` and refreshed every ~12h)
//   2. AI_GATEWAY_API_KEY (manual rotation, useful outside Vercel)
//
// In local dev with no key/OIDC token we treat the gateway as unavailable
// and the proposal-scoring path writes a stub summary instead of crashing.
const hasAuth = Boolean(
  process.env.VERCEL_OIDC_TOKEN || process.env.AI_GATEWAY_API_KEY
);

export const aiGateway = hasAuth ? gateway : null;

// Latest Anthropic Sonnet on the gateway. Validated against
// https://ai-gateway.vercel.sh/v1/models on 2026-05-06.
export const PROPOSAL_SCORING_MODEL = 'anthropic/claude-sonnet-4.6';
