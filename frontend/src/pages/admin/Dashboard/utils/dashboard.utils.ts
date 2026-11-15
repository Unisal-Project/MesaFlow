export const dateDaysAgo = (days: number): string => {
  const date = new Date();

  date.setDate(date.getDate() - days);

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

export const currency = (value: number): string =>
  value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });

const greetingPhrases = {
  morning: ["Bom dia, equipe!", "Bom dia! Que o salão encha hoje.", "Bom dia! Café passado, mesas prontas."],
  afternoon: ["Boa tarde, equipe!", "Boa tarde! Bora para o próximo turno.", "Boa tarde! Casa cheia é casa feliz."],
  night: ["Boa noite, equipe!", "Boa noite! Hora do movimento.", "Boa noite! Bom serviço a todos."],
};

export function greetingPeriod(date: Date): keyof typeof greetingPhrases {
  const hour = date.getHours();
  return hour < 5 || hour >= 18 ? "night" : hour < 12 ? "morning" : "afternoon";
}

export function dashboardGreeting(date: Date): string {
  const period = greetingPeriod(date);
  const localDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  // Data local + período: rotação diária estável, inclusive em viradas de mês/ano.
  const daySeed = Date.parse(`${localDate}T00:00:00Z`) / 86_400_000;
  const periodSeed = { morning: 0, afternoon: 1, night: 2 }[period];
  const phrases = greetingPhrases[period];
  return phrases[((daySeed + periodSeed) % phrases.length + phrases.length) % phrases.length];
}
