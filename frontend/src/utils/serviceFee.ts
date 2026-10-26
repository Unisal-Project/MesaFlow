export function calculateBill(subtotalInCents: number, serviceFeeWaived = false) {
  const serviceInCents = serviceFeeWaived ? 0 : Math.round(subtotalInCents * 0.1);
  return { subtotalInCents, serviceInCents, totalInCents: subtotalInCents + serviceInCents };
}
