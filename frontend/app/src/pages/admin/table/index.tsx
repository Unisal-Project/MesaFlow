import { fetchTables, saveTable as persistTable, removeTable, tableQrUrl, downloadTableQr, changeTableStatus, type TableRecord, type TableStatus } from "@/_services/tables.service";
import { useEffect, useState, type ComponentProps } from "react";
import {
  Armchair,
  Bell,
  Download,
  Pencil,
  Plus,
  QrCode,
  ReceiptText,
  Search,
} from "lucide-react";
import { Button } from "@/components/buttons/Button";
import { AdminSidebar } from "@/components/navigation/AdminSidebar";
import { TextField } from "@/components/inputs/TextField";
import trashIcon from "@/assets/lixeira-icon.png";
import "./styles.css";

type OrderItem = { name: string; quantity: number; price: string };
type RestaurantTable = Omit<TableRecord, "name"> & { name: string; orderValue?: string; order?: OrderItem[] };
type TableForm = { name: string; number: string; active: boolean };
type TablesProps = { onNavigate?: (id: string) => void };
type FormSubmitEvent = Parameters<
  NonNullable<ComponentProps<"form">["onSubmit"]>
>[0];

const emptyTableForm: TableForm = { name: "", number: "", active: true };
const statusInfo: Record<TableStatus, { label: string; description: string }> =
  {
    available: {
      label: "Disponível",
      description: "Disponível para novo atendimento",
    },
    occupied: { label: "Em aberto", description: "Mesa ocupada • atendimento em andamento" },
    closing_requested: { label: "Conta solicitada", description: "Mesa ocupada • preparando a conta" },
    awaiting_payment: {
      label: "Aguardando pagamento",
      description: "Mesa ocupada • aguardando fechamento",
    },
  };
const nextStatus: Record<TableStatus, { status: TableStatus; label: string }> = {
  available: { status: "occupied", label: "Iniciar atendimento" },
  occupied: { status: "closing_requested", label: "Solicitar conta" },
  closing_requested: { status: "awaiting_payment", label: "Aguardar pagamento" },
  awaiting_payment: { status: "available", label: "Fechar atendimento e liberar mesa" },
};

export default function Tables({ onNavigate }: TablesProps) {
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | TableStatus>("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [tableForm, setTableForm] = useState<TableForm>(emptyTableForm);
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(
    null,
  );
  const [selectedDetail, setSelectedDetail] = useState<"qr" | "order" | null>(
    null,
  );
  const [tableToDelete, setTableToDelete] = useState<RestaurantTable | null>(
    null,
  );

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const refresh = async () => {
    const data = await fetchTables();
    const updated = data.map((table) => ({ ...table, name: table.name || `Mesa ${table.number}` }));
    setTables(updated);
    setSelectedTable((current) => current ? updated.find((table) => table.id === current.id) ?? null : null);
  };
  useEffect(() => {
    let cancelled = false;
    fetchTables().then((data) => {
      if (!cancelled) setTables(data.map((table) => ({ ...table, name: table.name || `Mesa ${table.number}` })));
    }).catch((reason: Error) => { if (!cancelled) setError(reason.message); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const normalizedSearch = searchQuery.trim().toLocaleLowerCase("pt-BR");
  const filteredTables = tables.filter(
    (table) =>
      (statusFilter === "all" || table.status === statusFilter) &&
      table.name.toLocaleLowerCase("pt-BR").includes(normalizedSearch),
  );
  const closeForm = () => {
    setIsFormOpen(false);
    setEditingTableId(null);
    setTableForm(emptyTableForm);
  };
  const openNewTable = () => {
    setEditingTableId(null);
    setTableForm(emptyTableForm);
    setIsFormOpen(true);
  };
  const openEditTable = (table: RestaurantTable) => {
    setSelectedTable(null);
    setEditingTableId(table.id);
    setTableForm({
      name: table.name,
      number: String(table.number),
      active: table.active,
    });
    setIsFormOpen(true);
  };

  const saveTable = async (event: FormSubmitEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await persistTable({ name: tableForm.name.trim(), number: Number(tableForm.number), active: tableForm.active }, editingTableId ?? undefined);
      await refresh();
      closeForm();
    } catch (reason) { setError((reason as Error).message); }
    finally { setBusy(false); }
  };
  const deleteTable = async () => {
    if (!tableToDelete) return;
    setBusy(true);
    setError("");
    try {
      await removeTable(tableToDelete.id);
      await refresh();
      setTableToDelete(null);
      setSelectedTable(null);
    } catch (reason) { setError((reason as Error).message); }
    finally { setBusy(false); }
  };
  const advanceStatus = async () => {
    if (!selectedTable || busy) return;
    setBusy(true);
    setError("");
    try {
      const updated = await changeTableStatus(selectedTable, nextStatus[selectedTable.status].status);
      const table = { ...updated, name: updated.name || `Mesa ${updated.number}` };
      setTables((current) => current.map((item) => item.id === table.id ? table : item));
      setSelectedTable(table);
    } catch (reason) {
      setError((reason as Error).message);
      await refresh().catch(() => undefined);
    } finally { setBusy(false); }
  };

  return (
    <div className="tables-page">
      <AdminSidebar
        activeId="tables"
        onChange={onNavigate ?? (() => undefined)}
        userName="Nome do usuário"
        userRole="Administrador"
      />
      <main className="tables-content">
        {error && <p role="alert">{error}</p>}
        {loading && <p role="status">Carregando mesas…</p>}
        <div className="tables-topbar">
          <header className="tables-heading">
            <span>SALÃO</span>
            <h1>Mesas</h1>
            <p>Acompanhe a ocupação e organize as mesas do seu restaurante.</p>
          </header>
          <div className="tables-topbar-actions">
            <label className="table-search">
              <Search aria-hidden="true" />
              <input
                type="search"
                aria-label="Pesquisar mesa"
                placeholder="Buscar mesa"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </label>
            <button
              type="button"
              className="table-notifications"
              aria-label="Notificações"
            >
              <Bell aria-hidden="true" />
            </button>
            <Button onClick={openNewTable}>
              <Plus aria-hidden="true" />
              Cadastrar mesa
            </Button>
          </div>
        </div>
        <nav
          className="table-status-tabs"
          aria-label="Filtrar mesas por status"
        >
          <button
            type="button"
            className={statusFilter === "all" ? "active" : ""}
            onClick={() => setStatusFilter("all")}
          >
            Todas <span>{tables.length}</span>
          </button>
          <button
            type="button"
            className={statusFilter === "available" ? "active" : ""}
            onClick={() => setStatusFilter("available")}
          >
            Disponíveis{" "}
            <span>
              {tables.filter((table) => table.status === "available").length}
            </span>
          </button>
          <button
            type="button"
            className={statusFilter === "occupied" ? "active" : ""}
            onClick={() => setStatusFilter("occupied")}
          >
            Em aberto{" "}
            <span>
              {tables.filter((table) => table.status === "occupied").length}
            </span>
          </button>
          <button
            type="button"
            className={statusFilter === "closing_requested" ? "active" : ""}
            onClick={() => setStatusFilter("closing_requested")}
          >
            Conta solicitada <span>{tables.filter((table) => table.status === "closing_requested").length}</span>
          </button>
          <button
            type="button"
            className={statusFilter === "awaiting_payment" ? "active" : ""}
            onClick={() => setStatusFilter("awaiting_payment")}
          >
            Pagamento{" "}
            <span>
              {
                tables.filter((table) => table.status === "awaiting_payment")
                  .length
              }
            </span>
          </button>
        </nav>
        <section className="tables-list" aria-labelledby="tables-list-title">
          <header className="tables-list-heading">
            <div>
              <h2 id="tables-list-title">Mapa de mesas</h2>
              <p>
                {normalizedSearch || statusFilter !== "all"
                  ? `${filteredTables.length} de ${tables.length} mesas`
                  : "Clique em uma mesa para ver o pedido e o QR Code."}
              </p>
            </div>
          </header>
          <div className="tables-grid">
            {filteredTables.map((table) => (
              <article className={`table-card ${table.status}`} key={table.id}>
                <button
                  type="button"
                  className="table-card-main"
                  onClick={() => {
                    setError("");
                    setSelectedTable(table);
                    setSelectedDetail(null);
                  }}
                  aria-label={`Ver detalhes da ${table.name}`}
                >
                  <div className="table-card-topline">
                    <strong className="table-number">
                      {String(table.number).padStart(2, "0")}
                    </strong>
                    <span className={`table-status ${table.status}`}>
                      {statusInfo[table.status].label}
                    </span>
                  </div>
                  <div className="table-card-info">
                    <h3>{table.name}{!table.active && " (Inativa)"}</h3>
                    <p>{statusInfo[table.status].description}</p>
                  </div>
                </button>
                <footer className="table-card-value">
                  <span>Valor atual</span>
                  <strong>{table.orderValue ?? "—"}</strong>
                </footer>
              </article>
            ))}
            {filteredTables.length === 0 && (
              <div className="tables-no-results">
                <Armchair aria-hidden="true" />
                <p>Nenhuma mesa encontrada para os filtros selecionados.</p>
              </div>
            )}
          </div>
        </section>
      </main>

      {selectedTable && (
        <div
          className="table-modal-backdrop"
          role="presentation"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setSelectedTable(null)
          }
        >
          <section
            className="table-details-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="table-details-title"
          >
            <header className="table-modal-heading">
              <div>
                <span className={`table-status ${selectedTable.status}`}>
                  {statusInfo[selectedTable.status].label}
                </span>
                <h2 id="table-details-title">{selectedTable.name}</h2>
                <p>{statusInfo[selectedTable.status].description}</p>
              </div>
              <button
                type="button"
                className="table-modal-close"
                aria-label="Fechar"
                onClick={() => setSelectedTable(null)}
              >
                ×
              </button>
            </header>
            <div className="table-modal-body">
              {error && selectedDetail !== "qr" && <p role="alert">{error}</p>}
              {selectedDetail === null && (
                <div className="table-options">
                  <Button type="button" disabled={busy || (!selectedTable.active && selectedTable.status === "available")} onClick={advanceStatus}>
                    {busy ? "Atualizando…" : nextStatus[selectedTable.status].label}
                  </Button>
                  <p>O que você deseja consultar?</p>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setSelectedDetail("qr")}
                  >
                    <QrCode aria-hidden="true" />
                    Gerar QR Code
                  </Button>
                  {selectedTable.order?.length ? (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setSelectedDetail("order")}
                    >
                      <ReceiptText aria-hidden="true" />
                      Ver pedido
                    </Button>
                  ) : (
                    <span className="table-no-order">
                      Detalhes dos pedidos disponíveis na área de pedidos.
                    </span>
                  )}
                </div>
              )}
              {selectedDetail === "qr" && (
                <div className="table-qr-view">
                  <QrCode aria-hidden="true" />
                  <h3>QR Code da mesa</h3>
                  <p>
                    O cliente usa este código para acessar o cardápio e
                    identificar a mesa de origem.
                  </p>
                  <img src={tableQrUrl(selectedTable.id)} alt={`QR Code da mesa ${selectedTable.number}`} width={240} height={240} onError={() => setError("Não foi possível carregar o QR Code")} />
                  <small><a href={selectedTable.menuUrl} target="_blank" rel="noreferrer">Abrir cardápio desta mesa</a></small>
                  {error && <p role="alert">{error}</p>}
                  <Button type="button" variant="secondary" onClick={() => downloadTableQr(selectedTable.id).catch((reason: Error) => setError(reason.message))}>
                    <Download aria-hidden="true" />
                    Baixar PNG
                  </Button>
                </div>
              )}
              {selectedDetail === "order" && (
                <div className="table-order-view">
                  <div className="table-section-heading">
                    <ReceiptText aria-hidden="true" />
                    <h3>Pedido atual</h3>
                  </div>
                  <div className="order-items">
                    {selectedTable.order?.map((item) => (
                      <div key={item.name}>
                        <span>
                          {item.quantity}× {item.name}
                        </span>
                        <strong>{item.price}</strong>
                      </div>
                    ))}
                  </div>
                  <div className="order-total">
                    <span>Total da conta</span>
                    <strong>{selectedTable.orderValue}</strong>
                  </div>
                </div>
              )}
            </div>
            <footer className="table-detail-actions">
              {selectedDetail ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setSelectedDetail(null)}
                >
                  Voltar
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setSelectedTable(null)}
                >
                  Fechar
                </Button>
              )}
              <Button
                type="button"
                disabled={busy}
                onClick={() => openEditTable(selectedTable)}
              >
                <Pencil aria-hidden="true" />
                Editar mesa
              </Button>
            </footer>
          </section>
        </div>
      )}
      {isFormOpen && (
        <div
          className="table-modal-backdrop"
          role="presentation"
          onMouseDown={(event) =>
            event.target === event.currentTarget && closeForm()
          }
        >
          <section
            className="table-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="table-form-title"
          >
            <header className="table-modal-heading">
              <div>
                <h2 id="table-form-title">
                  {editingTableId === null ? "Nova mesa" : "Editar mesa"}
                </h2>
                <p>
                  {editingTableId === null
                    ? "Cadastre uma mesa para organizar o atendimento no salão."
                    : "Atualize as informações e o status desta mesa."}
                </p>
              </div>
              <button
                type="button"
                className="table-modal-close"
                aria-label="Fechar"
                onClick={closeForm}
              >
                ×
              </button>
            </header>
            <form className="table-form" onSubmit={saveTable}>
              <TextField
                label="Nome da mesa"
                autoFocus
                required
                maxLength={40}
                placeholder="Ex.: Mesa 09"
                value={tableForm.name}
                onChange={(event) =>
                  setTableForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
              <TextField label="Número da mesa" type="number" min={1} step={1} required value={tableForm.number} onChange={(event) => setTableForm((current) => ({ ...current, number: event.target.value }))} />
              <label><input type="checkbox" checked={tableForm.active} onChange={(event) => setTableForm((current) => ({ ...current, active: event.target.checked }))} /> Mesa ativa</label>
              {error && <p role="alert">{error}</p>}
              <footer className="table-modal-actions">
                <div>
                  {editingTableId !== null && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="table-delete-action"
                      onClick={() => {
                        const table = tables.find(
                          (item) => item.id === editingTableId,
                        );
                        closeForm();
                        if (table) setTableToDelete(table);
                      }}
                    >
                      <img src={trashIcon} alt="" />
                      Excluir mesa
                    </Button>
                  )}
                </div>
                <div className="table-modal-save-actions">
                  <Button type="button" variant="ghost" onClick={closeForm}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={busy}>
                    {editingTableId === null
                      ? "Cadastrar mesa"
                      : "Salvar alterações"}
                  </Button>
                </div>
              </footer>
            </form>
          </section>
        </div>
      )}
      {tableToDelete && (
        <div
          className="table-modal-backdrop"
          role="presentation"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setTableToDelete(null)
          }
        >
          <section
            className="table-delete-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-table-title"
          >
            <div className="table-delete-dialog-icon">
              <img src={trashIcon} alt="" />
            </div>
            <h2 id="delete-table-title">Excluir mesa?</h2>
            {error && <p role="alert">{error}</p>}
            <p>
              “{tableToDelete.name}” será removida permanentemente da lista de
              mesas.
            </p>
            <footer>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setTableToDelete(null)}
              >
                Cancelar
              </Button>
              <Button type="button" variant="danger" disabled={busy} onClick={deleteTable}>
                Excluir
              </Button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
