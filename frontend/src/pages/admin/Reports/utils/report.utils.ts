export const hasLowSales = (revenue: number, dailyAverage: number) =>
  revenue === 0 || revenue < dailyAverage * .5;
