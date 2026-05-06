const CLIENT_FEE_RATE = 0.02;
const SUPPLIER_FEE_RATE = 0.03;
const VAT_RATE = 0.15;

// Defensive bounds. Anything above this is almost certainly a bug or
// data-entry mistake (a 1B SAR project on a B2B exhibition platform?).
const MAX_CONTRACT_PRICE = 1_000_000_000;

export class EscrowInputError extends Error {
  readonly cause: 'nan' | 'infinite' | 'negative' | 'too_large';
  constructor(cause: 'nan' | 'infinite' | 'negative' | 'too_large', message: string) {
    super(message);
    this.cause = cause;
    this.name = 'EscrowInputError';
  }
}

export interface EscrowCalculation {
  totalAmount: number;
  initialDeposit: number;
  finalPayment: number;
  clientFee: number;
  supplierFee: number;
  platformRevenue: number;
  supplierNet: number;
  clientFeeVat: number;
  supplierFeeVat: number;
  totalVat: number;
  vatRateApplied: number;
}

/**
 * Compute the full escrow breakdown for a contract.
 *
 * Throws `EscrowInputError` for inputs we can't reason about (NaN, Infinity,
 * negative, absurdly large). Zero is allowed — it returns an all-zero
 * breakdown which is what the UI wants for an empty draft.
 *
 * Use `safeCalculateEscrow` if you need a non-throwing variant for render paths.
 */
export function calculateEscrow(contractPrice: number): EscrowCalculation {
  if (Number.isNaN(contractPrice)) {
    throw new EscrowInputError('nan', 'Contract price must be a number, got NaN');
  }
  if (!Number.isFinite(contractPrice)) {
    throw new EscrowInputError('infinite', 'Contract price must be finite');
  }
  if (contractPrice < 0) {
    throw new EscrowInputError('negative', 'Contract price cannot be negative');
  }
  if (contractPrice > MAX_CONTRACT_PRICE) {
    throw new EscrowInputError(
      'too_large',
      `Contract price exceeds the safe upper bound of ${MAX_CONTRACT_PRICE.toLocaleString('en')} SAR`
    );
  }

  const clientFee = round(contractPrice * CLIENT_FEE_RATE);
  const supplierFee = round(contractPrice * SUPPLIER_FEE_RATE);
  const platformRevenue = round(clientFee + supplierFee);
  const supplierNet = round(contractPrice - supplierFee);

  const clientFeeVat = round(clientFee * VAT_RATE);
  const supplierFeeVat = round(supplierFee * VAT_RATE);
  const totalVat = round(clientFeeVat + supplierFeeVat);

  const totalAmount = round(contractPrice + clientFee + clientFeeVat);
  const initialDeposit = round(totalAmount * 0.5);
  const finalPayment = round(totalAmount - initialDeposit);

  return {
    totalAmount,
    initialDeposit,
    finalPayment,
    clientFee,
    supplierFee,
    platformRevenue,
    supplierNet,
    clientFeeVat,
    supplierFeeVat,
    totalVat,
    vatRateApplied: VAT_RATE,
  };
}

/**
 * Non-throwing variant. Returns null for invalid inputs so render paths
 * can gracefully show 'unknown' instead of crashing the page.
 */
export function safeCalculateEscrow(
  contractPrice: number | null | undefined
): EscrowCalculation | null {
  if (contractPrice == null) return null;
  try {
    return calculateEscrow(contractPrice);
  } catch (err) {
    if (err instanceof EscrowInputError) return null;
    throw err;
  }
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
