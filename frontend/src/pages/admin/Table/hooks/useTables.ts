import { useState, type FormEvent } from "react";
import type { TableStatus } from "@/services/tables.service";
import { emptyTableForm, nextStatus } from "../constants/table.constants";
import { createMockTables } from "../mocks/tables.mock";
import type { RestaurantTable, TableForm } from "../types/table.types";

export function useTables() {
  const [tables, setTables] = useState<RestaurantTable[]>(createMockTables);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | TableStatus>("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [tableForm, setTableForm] = useState<TableForm>(emptyTableForm);
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(
    null,
  );
  const [selectedDetail, setSelectedDetail] = useState<"qr" | null>(null);
  const [tableToDelete, setTableToDelete] = useState<RestaurantTable | null>(
    null,
  );
  const [error, setError] = useState("");
  const busy = false;
  const loading = false;

  const normalizedSearch = searchQuery.trim().toLocaleLowerCase("pt-BR");
  const filteredTables = tables.filter(
    (table) =>
      (statusFilter === "all" ||
        (statusFilter === "closing_requested"
          ? table.status === "closing_requested" ||
            table.status === "awaiting_payment"
          : table.status === statusFilter)) &&
      (table.name.toLocaleLowerCase("pt-BR").includes(normalizedSearch) ||
        String(table.number).padStart(2, "0").includes(normalizedSearch)),
  );
  const closeForm = () => {
    setIsFormOpen(false);
    setEditingTableId(null);
    setTableForm(emptyTableForm);
    setError("");
  };
  const openNewTable = () => {
    setEditingTableId(null);
    setTableForm({
      ...emptyTableForm,
      number: String(Math.max(0, ...tables.map((table) => table.number)) + 1),
    });
    setError("");
    setIsFormOpen(true);
  };
  const openEditTable = (table: RestaurantTable) => {
    setSelectedTable(null);
    setEditingTableId(table.id);
    setError("");
    setTableForm({
      name: table.name,
      number: String(table.number),
      seats: String(table.seats ?? 4),
      active: table.active,
    });
    setIsFormOpen(true);
  };
  const saveTable = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const number = Number(tableForm.number);
    const identification = tableForm.name.trim();
    const name = /^\d+$/.test(identification)
      ? `Mesa ${String(number).padStart(2, "0")}`
      : identification;
    const seats = Number(tableForm.seats);
    if (!name || name.length > 40 || !Number.isInteger(number) || number < 1) {
      setError("Informe um nome e um número de mesa válido.");
      return;
    }
    if (!Number.isInteger(seats) || seats < 1) {
      setError("Informe uma capacidade válida, com pelo menos 1 lugar.");
      return;
    }
    if (
      tables.some(
        (table) => table.number === number && table.id !== editingTableId,
      )
    ) {
      setError("Já existe uma mesa com esse número.");
      return;
    }
    const current = tables.find((table) => table.id === editingTableId);
    if (current && current.status !== "available" && !tableForm.active) {
      setError("Finalize o atendimento antes de desativar a mesa.");
      return;
    }
    if (current) {
      setTables((entries) =>
        entries.map((table) =>
          table.id === current.id
            ? { ...table, name, number, seats, active: tableForm.active }
            : table,
        ),
      );
    } else {
      const table: RestaurantTable = {
        id: `mock-table-${crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`,
        name,
        number,
        active: tableForm.active,
        status: "available",
        attendanceId: null,
        menuUrl: "",
        seats,
      };
      setTables((entries) =>
        [...entries, table].sort((a, b) => a.number - b.number),
      );
    }
    closeForm();
  };
  const deleteTable = async () => {
    if (!tableToDelete) return;
    if (tableToDelete.status !== "available") {
      setError("Finalize o atendimento antes de excluir a mesa.");
      return;
    }
    setTables((entries) =>
      entries.filter((table) => table.id !== tableToDelete.id),
    );
    setTableToDelete(null);
    setSelectedTable(null);
    setError("");
  };
  const advanceStatus = async () => {
    if (!selectedTable) return;
    if (!selectedTable.active && selectedTable.status === "available") {
      setError("Ative a mesa antes de iniciar um atendimento.");
      return;
    }
    const status = nextStatus[selectedTable.status].status;
    const table: RestaurantTable = {
      ...selectedTable,
      status,
      attendanceId:
        status === "available"
          ? null
          : (selectedTable.attendanceId ??
            `mock-attendance-${crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`),
      openedAt:
        status === "available"
          ? undefined
          : (selectedTable.openedAt ?? new Date().toISOString()),
      people: status === "available" ? undefined : (selectedTable.people ?? 2),
      closingRequestedAt:
        status === "closing_requested" || status === "awaiting_payment"
          ? (selectedTable.closingRequestedAt ?? new Date().toISOString())
          : undefined,
      order: status === "available" ? undefined : selectedTable.order,
      orderValue: status === "available" ? undefined : selectedTable.orderValue,
    };
    setTables((entries) =>
      entries.map((entry) => (entry.id === table.id ? table : entry)),
    );
    setSelectedTable(table);
    setError("");
  };
  return {
    tables,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    isFormOpen,
    editingTableId,
    tableForm,
    setTableForm,
    selectedTable,
    setSelectedTable,
    selectedDetail,
    setSelectedDetail,
    tableToDelete,
    setTableToDelete,
    error,
    setError,
    busy,
    loading,
    normalizedSearch,
    filteredTables,
    closeForm,
    openNewTable,
    openEditTable,
    saveTable,
    deleteTable,
    advanceStatus,
  };
}
