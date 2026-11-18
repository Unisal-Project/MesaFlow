/**
 * Dia de operação: data local no fuso do restaurante, deslocada pela hora de
 * virada (com virada 05:00, 03:40 do dia 18 ainda é o dia 17). É a mesma regra
 * do backend (backend/src/modules/orders/daily-number.ts), e vale para o número
 * do pedido, "Hoje" em Pedidos, Dashboard e Relatórios.
 */
// O backend guarda o fuso em restaurant_settings.timezone, mas ele ainda não é
// editável nem vai na API de configurações: o padrão é o único valor possível.
export const RESTAURANT_TIMEZONE = "America/Sao_Paulo";
const DEFAULT_CUTOFF_HOUR = 5;

// Hora de virada vinda de /settings (carregada ao abrir o admin; até lá, o padrão).
let cutoffHour = DEFAULT_CUTOFF_HOUR;
export const getDayCutoff = () => cutoffHour;
export const setDayCutoff = (hour: number | undefined) => {
  cutoffHour = Number.isInteger(hour) && hour! >= 0 && hour! <= 23 ? hour! : DEFAULT_CUTOFF_HOUR;
};

export const toBusinessDate = (now: Date, cutoff = cutoffHour) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: RESTAURANT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(now.getTime() - cutoff * 3_600_000));

/** Soma dias a uma data AAAA-MM-DD (aritmética de calendário, sem fuso). */
export const addDays = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

export const businessToday = (now = new Date()) => toBusinessDate(now);
export const businessDaysAgo = (days: number, now = new Date()) => addDays(businessToday(now), -days);
