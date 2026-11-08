import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  changeTableStatus,
  fetchTables,
  removeTable,
  saveTable as persistTable,
  type TableRecord,
  type TableStatus,
} from "@/services/tables.service";
import { emptyTableForm, nextStatus } from "../constants/table.constants";
import type { RestaurantTable, TableForm } from "../types/table.types";

const message = (error: unknown) =>
  error instanceof Error ? error.message : "Não foi possível acessar o servidor";

// A API usa null para campos ausentes; a tela trabalha com opcionais.
const toTable = (record: TableRecord): RestaurantTable => ({
  ...record,
  name: record.name ?? `Mesa ${String(record.number).padStart(2, "0")}`,
  openedAt: record.openedAt ?? undefined,
  closingRequestedAt: record.closingRequestedAt ?? undefined,
});

const byNumber = (a: RestaurantTable, b: RestaurantTable) => a.number - b.number;

export function useTables() {
  const [tables, setTables] = useState<RestaurantTable[]>([]);
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
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(
    () =>
      fetchTables()
        .then((records) => {
          setTables(records.map(toTable).sort(byNumber));
          setError("");
        })
        .catch((err: unknown) => setError(message(err)))
        .finally(() => setLoading(false)),
    [],
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  const replaceTable = (table: RestaurantTable) =>
    setTables((entries) =>
      entries.map((entry) => (entry.id === table.id ? table : entry)),
    );

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
      seats: String(table.seats),
      active: table.active,
    });
    setIsFormOpen(true);
  };
  const saveTable = async (event: FormEvent<HTMLFormElement>) => {
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
    if (!Number.isInteger(seats) || seats < 1 || seats > 99) {
      setError("Informe uma capacidade entre 1 e 99 lugares.");
      return;
    }
    // As regras abaixo também são garantidas pelo backend; aqui só antecipam o aviso.
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
    setBusy(true);
    try {
      const saved = toTable(
        await persistTable(
          { name, number, seats, active: tableForm.active },
          current?.id,
        ),
      );
      setTables((entries) =>
        (current
          ? entries.map((table) => (table.id === saved.id ? saved : table))
          : [...entries, saved]
        ).sort(byNumber),
      );
      closeForm();
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  };
  const deleteTable = async () => {
    if (!tableToDelete) return;
    if (tableToDelete.status !== "available") {
      setError("Finalize o atendimento antes de excluir a mesa.");
      return;
    }
    setBusy(true);
    try {
      await removeTable(tableToDelete.id);
      setTables((entries) =>
        entries.filter((table) => table.id !== tableToDelete.id),
      );
      setTableToDelete(null);
      setSelectedTable(null);
      setError("");
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  };
  const advanceStatus = async () => {
    if (!selectedTable) return;
    if (!selectedTable.active && selectedTable.status === "available") {
      setError("Ative a mesa antes de iniciar um atendimento.");
      return;
    }
    setBusy(true);
    try {
      const table = toTable(
        await changeTableStatus(
          selectedTable,
          nextStatus[selectedTable.status].status,
        ),
      );
      replaceTable(table);
      setSelectedTable(table);
      setError("");
    } catch (err) {
      setError(message(err));
      // Outro usuário pode ter mudado a mesa; recarrega para mostrar o estado real.
      void reload();
    } finally {
      setBusy(false);
    }
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
    reload,
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
