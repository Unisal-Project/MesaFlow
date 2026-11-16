export function calculateBill(subtotalInCents: number, serviceFeeRate: number, serviceFeeWaived = false) {
  const rateBasisPoints = Math.round(serviceFeeRate * 100);
  const serviceInCents = serviceFeeWaived ? 0 : Math.round(subtotalInCents * rateBasisPoints / 10_000);
  return { subtotalInCents, serviceInCents, totalInCents: subtotalInCents + serviceInCents };
}
