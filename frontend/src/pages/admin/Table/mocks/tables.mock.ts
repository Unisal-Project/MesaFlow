import type { RestaurantTable } from "../types/table.types";

export function createMockTables(): RestaurantTable[] {
  const statuses: RestaurantTable["status"][] = [
    "available",
    "occupied",
    "occupied",
    "available",
    "closing_requested",
    "occupied",
    "available",
    "occupied",
    "occupied",
    "awaiting_payment",
    "available",
    "occupied",
  ];
  const minutes = [0, 38, 12, 0, 56, 22, 0, 41, 15, 67, 0, 31];
  const places = [4, 2, 4, 4, 3, 2, 6, 4, 2, 4, 2, 5];
  return statuses.map((status, index) => {
    const number = index + 1;
    const occupied = status !== "available";
    const openedAt = occupied
      ? new Date(Date.now() - minutes[index] * 60_000).toISOString()
      : undefined;
    return {
      id: `mock-table-${number}`,
      number,
      name: `Mesa ${String(number).padStart(2, "0")}`,
      active: true,
      status,
      attendanceId: occupied ? `mock-attendance-${number}` : null,
      menuUrl: "",
      seats: places[index],
      people: occupied ? places[index] : undefined,
      openedAt,
      closingRequestedAt:
        status === "closing_requested" || status === "awaiting_payment"
          ? new Date().toISOString()
          : undefined,
      orderValue: occupied ? "R$ 75,80" : undefined,
      order: occupied
        ? [
            { name: "X-Burger artesanal", quantity: 2, price: "R$ 57,80" },
            { name: "Batata rústica", quantity: 1, price: "R$ 18,00" },
          ]
        : undefined,
    };
  });
}
