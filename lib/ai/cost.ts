// Phase V1.1 — Token → USD cost computation for AI gateway calls.
//
// Rates are per-million-tokens (MTok) and reflect the Claude Sonnet 4.6
// list price as of the Phase V kickoff. The Vercel AI Gateway passes the
// underlying Anthropic prices through, so this table is authoritative for
// both direct + gateway billing.

const MTOK = 1_000_000;

// Provider list prices, USD per 1M tokens. Add models as the project
// grows; the lookup is exact-match (no regex) so misspellings throw.
const MODEL_RATES: Record<string, { inputPerMTok: number; outputPerMTok: number }> = {
  'anthropic/claude-sonnet-4.6': { inputPerMTok: 3.0, outputPerMTok: 15.0 },
  'anthropic/claude-opus-4.7': { inputPerMTok: 15.0, outputPerMTok: 75.0 },
  'anthropic/claude-haiku-4.5': { inputPerMTok: 0.8, outputPerMTok: 4.0 },
};

export interface ComputeCostInput {
  tokensIn: number;
  tokensOut: number;
  model: string;
}

export function computeCost({ tokensIn, tokensOut, model }: ComputeCostInput): number {
  const rate = MODEL_RATES[model];
  if (!rate) {
    // Conservative fallback — bill at Opus rate so an unknown model never
    // silently undercounts cost. Logs in the caller (recordUsage) carry
    // the model name so an unknown entry is easy to spot.
    const fallback = MODEL_RATES['anthropic/claude-opus-4.7'];
    return (
      (tokensIn / MTOK) * fallback.inputPerMTok +
      (tokensOut / MTOK) * fallback.outputPerMTok
    );
  }
  return (
    (tokensIn / MTOK) * rate.inputPerMTok +
    (tokensOut / MTOK) * rate.outputPerMTok
  );
}

export function hasModelRate(model: string): boolean {
  return model in MODEL_RATES;
}

// Exported only for the test suite so future rate updates don't quietly
// drift the assertions.
export const _MODEL_RATES_FOR_TEST = MODEL_RATES;
