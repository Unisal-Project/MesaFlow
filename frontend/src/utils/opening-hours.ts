export const openingDays = [
  { id: "Seg", label: "Segunda-feira" },
  { id: "Ter", label: "Terça-feira" },
  { id: "Qua", label: "Quarta-feira" },
  { id: "Qui", label: "Quinta-feira" },
  { id: "Sex", label: "Sexta-feira" },
  { id: "Sáb", label: "Sábado" },
  { id: "Dom", label: "Domingo" },
] as const;
export type OpeningDay = {
  id: string;
  label: string;
  open: boolean;
  from: string;
  to: string;
};
export const emptyOpeningHours = (): OpeningDay[] =>
  openingDays.map((day) => ({ ...day, open: false, from: "", to: "" }));
export function parseOpeningHours(
  value: string | null | undefined,
): OpeningDay[] | null {
  if (!value?.trim()) return emptyOpeningHours();
  const parts = value.split("; ");
  if (parts.length !== openingDays.length) return null;
  const result: OpeningDay[] = [];
  for (const [index, day] of openingDays.entries()) {
    const prefix = `${day.id}: `;
    if (!parts[index].startsWith(prefix)) return null;
    const hours = parts[index].slice(prefix.length);
    if (hours === "Fechado")
      result.push({ ...day, open: false, from: "", to: "" });
    else {
      const match = hours.match(/^(\d{2}:\d{2})?-(\d{2}:\d{2})?$/);
      if (!match) return null;
      result.push({
        ...day,
        open: true,
        from: match[1] ?? "",
        to: match[2] ?? "",
      });
    }
  }
  return result;
}
export const serializeOpeningHours = (days: OpeningDay[]) =>
  days
    .map(
      (day) => `${day.id}: ${day.open ? `${day.from}-${day.to}` : "Fechado"}`,
    )
    .join("; ");
export function openingHoursError(value: string): string {
  const days = parseOpeningHours(value);
  if (!days) return "";
  const time = /^([01]\d|2[0-3]):[0-5]\d$/;
  for (const day of days) {
    if (!day.open) continue;
    if (!time.test(day.from) || !time.test(day.to))
      return `Informe a abertura e o fechamento de ${day.label.toLocaleLowerCase("pt-BR")}.`;
    if (day.from === day.to)
      return `A abertura e o fechamento de ${day.label.toLocaleLowerCase("pt-BR")} precisam ser diferentes.`;
  }
  return "";
}
