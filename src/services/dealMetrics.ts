export type PriceObservation = {
  listPrice: number | null;
  discountedPrice: number | null;
  discountPercent: number | null;
};

export function isAtHistoricalLow(price: number | null, minimum: number | null): boolean {
  return price !== null && minimum !== null && price <= minimum;
}

export function calculateDealMetrics(current: PriceObservation, previous: PriceObservation | null, priorPrices: Array<number | null>) {
  const priorValues = priorPrices.filter((price): price is number => price !== null);
  const priorMinimum = priorValues.length ? Math.min(...priorValues) : null;
  const values = [...priorValues, current.discountedPrice].filter((price): price is number => price !== null);
  const historicalMinDiscountedPrice = values.length ? Math.min(...values) : null;
  const isHistoricalLow = isAtHistoricalLow(current.discountedPrice, historicalMinDiscountedPrice);
  // A first observation establishes a baseline; it is not a newly broken record.
  const isNewHistoricalLow = current.discountedPrice !== null && priorMinimum !== null && current.discountedPrice < priorMinimum;
  const previousDiscountedPrice = previous?.discountedPrice ?? null;
  const dropVsPrevious = current.discountedPrice !== null && previousDiscountedPrice !== null
    ? previousDiscountedPrice - current.discountedPrice : null;
  const savingsVsPreviousPercent = dropVsPrevious !== null && previousDiscountedPrice !== null && previousDiscountedPrice > 0
    ? dropVsPrevious / previousDiscountedPrice * 100 : null;
  const hasHighDiscount = current.discountPercent !== null && current.discountPercent >= 40;
  const looksLikeInflatedBasePrice = current.listPrice !== null && current.discountedPrice !== null && current.discountPercent !== null &&
    previous?.listPrice != null && previous.discountedPrice !== null && previous.discountPercent !== null &&
    current.listPrice > previous.listPrice && current.discountPercent > previous.discountPercent && current.discountedPrice >= previous.discountedPrice;
  const dealScore = (isHistoricalLow ? 50 : 0) + ((dropVsPrevious ?? 0) > 0 ? 30 : 0) + (hasHighDiscount ? 20 : 0) +
    Math.min(savingsVsPreviousPercent ?? 0, 25) - (looksLikeInflatedBasePrice ? 25 : 0);
  return { previousDiscountedPrice, historicalMinDiscountedPrice, isHistoricalLow, isNewHistoricalLow,
    dropVsPrevious, savingsVsPreviousPercent, hasHighDiscount, looksLikeInflatedBasePrice, dealScore };
}
