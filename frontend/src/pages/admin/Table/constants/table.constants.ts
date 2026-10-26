import type { TableStatus } from "@/services/tables.service";

import type { TableForm } from "../types/table.types";

export const emptyTableForm: TableForm = {
  name: "",
  number: "",
  seats: "",
  active: true,
};

export const statusInfo: Record<
  TableStatus,
  {
    label: string;
    description: string;
  }
> = {
  available: {
    label: "Disponível",
    description: "Disponível para novo atendimento",
  },

  occupied: {
    label: "Em aberto",
    description: "Mesa ocupada • atendimento em andamento",
  },

  closing_requested: {
    label: "Conta solicitada",
    description: "Mesa ocupada • preparando a conta",
  },

  awaiting_payment: {
    label: "Aguardando pagamento",
    description: "Mesa ocupada • aguardando fechamento",
  },
};

export const nextStatus: Record<
  TableStatus,
  {
    status: TableStatus;
    label: string;
  }
> = {
  available: {
    status: "occupied",
    label: "Iniciar atendimento",
  },

  occupied: {
    status: "closing_requested",
    label: "Solicitar conta",
  },

  closing_requested: {
    status: "awaiting_payment",
    label: "Aguardar pagamento",
  },

  awaiting_payment: {
    status: "available",
    label: "Fechar atendimento e liberar mesa",
  },
};