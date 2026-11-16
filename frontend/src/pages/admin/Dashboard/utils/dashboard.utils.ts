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

// Motivadoras, mas sérias; curtas para caber no título do painel.
const greetingPhrases = {
  morning: [
    "Bom dia! Um bom serviço começa na preparação.",
    "Bom dia, equipe! Organização agora, tranquilidade no pico.",
    "Bom dia! Hoje é dia de fazer o cliente querer voltar.",
  ],
  afternoon: [
    "Boa tarde! Atenção aos detalhes faz a diferença.",
    "Boa tarde, equipe! Ritmo firme até o fim do turno.",
    "Boa tarde! Cada pedido é uma chance de surpreender.",
  ],
  night: [
    "Boa noite! Hora de mostrar o melhor do nosso serviço.",
    "Boa noite, equipe! Casa cheia, cabeça fria.",
    "Boa noite! Capricho em cada prato, cuidado em cada mesa.",
  ],
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
