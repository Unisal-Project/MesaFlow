export function calculateBill(subtotalInCents: number, serviceFeeRate: number, serviceFeeWaived = false) {
  const serviceInCents = serviceFeeWaived ? 0 : Math.round(subtotalInCents * serviceFeeRate / 100);
  return { subtotalInCents, serviceInCents, totalInCents: subtotalInCents + serviceInCents };
}
