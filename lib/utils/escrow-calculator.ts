const CLIENT_FEE_RATE = 0.02;
const SUPPLIER_FEE_RATE = 0.03;
const VAT_RATE = 0.15;

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

export function calculateEscrow(contractPrice: number): EscrowCalculation {
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

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
