export const paymentMethodLabels = {
  pix: "Pix",
  cash: "Dinheiro",
  debit: "Débito",
  credit: "Crédito",
} as const;


export const orderPeriods = [
  { id: "today", label: "Hoje" },
  { id: "yesterday", label: "Ontem" },
  { id: "7days", label: "7 dias" },
  { id: "30days", label: "30 dias" },
  { id: "specific", label: "Data" },
];

export const emptyPeriodMessages = {
  today: "Nenhum pedido hoje.",
  yesterday: "Nenhum pedido ontem.",
  "7days": "Nenhum pedido nos últimos 7 dias.",
  "30days": "Nenhum pedido nos últimos 30 dias.",
  specific: "Nenhum pedido nesta data.",
  all: "Nenhum pedido encontrado.",
};
