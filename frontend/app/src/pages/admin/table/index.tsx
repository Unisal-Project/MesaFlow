import { useState, type ComponentProps } from "react";
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

type TableStatus = "available" | "occupied" | "awaiting_payment";
type OrderItem = { name: string; quantity: number; price: string };
type RestaurantTable = {
  id: number;
  name: string;
  status: TableStatus;
  orderValue?: string;
  order?: OrderItem[];
};
type TableForm = Pick<RestaurantTable, "name" | "status" | "orderValue">;
type TablesProps = { onNavigate?: (id: string) => void };
type FormSubmitEvent = Parameters<
  NonNullable<ComponentProps<"form">["onSubmit"]>
>[0];

const initialTables: RestaurantTable[] = [
  { id: 1, name: "Mesa 01", status: "available" },
  {
    id: 2,
    name: "Mesa 02",
    status: "occupied",
    orderValue: "R$ 86,40",
    order: [
      { name: "X-Burger artesanal", quantity: 2, price: "R$ 57,80" },
      { name: "Batata rústica", quantity: 1, price: "R$ 18,00" },
      { name: "Refrigerante lata", quantity: 1, price: "R$ 10,60" },
    ],
  },
  {
    id: 3,
    name: "Mesa 03",
    status: "awaiting_payment",
    orderValue: "R$ 54,90",
    order: [
      { name: "Pizza individual", quantity: 1, price: "R$ 44,90" },
      { name: "Água sem gás", quantity: 1, price: "R$ 10,00" },
    ],
  },
  { id: 4, name: "Mesa 04", status: "available" },
  {
    id: 5,
    name: "Mesa 05",
    status: "occupied",
    orderValue: "R$ 42,90",
    order: [
      { name: "Combo executivo", quantity: 1, price: "R$ 34,90" },
      { name: "Suco de laranja", quantity: 1, price: "R$ 8,00" },
    ],
  },
  { id: 6, name: "Mesa 06", status: "available" },
  {
    id: 7,
    name: "Mesa 07",
    status: "awaiting_payment",
    orderValue: "R$ 118,00",
    order: [
      { name: "Pizza família", quantity: 1, price: "R$ 78,00" },
      { name: "Refrigerante 2L", quantity: 2, price: "R$ 24,00" },
      { name: "Brownie", quantity: 2, price: "R$ 16,00" },
    ],
  },
  { id: 8, name: "Mesa 08", status: "available" },
];

const emptyTableForm: TableForm = {
  name: "",
  status: "available",
  orderValue: "",
};
const statusInfo: Record<TableStatus, { label: string; description: string }> =
  {
    available: {
      label: "Livre",
      description: "Disponível para novo atendimento",
    },
    occupied: { label: "Ocupada", description: "Conta em andamento" },
    awaiting_payment: {
      label: "Aguardando pagamento",
      description: "Conta em andamento",
    },
  };

function VisualQrCode() {
  return (
    <div className="visual-qr" aria-label="QR Code da mesa">
      <span />
      <span />
      <span />
      <i />
    </div>
  );
}

export default function Tables({ onNavigate }: TablesProps) {
  const [tables, setTables] = useState(initialTables);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | TableStatus>("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTableId, setEditingTableId] = useState<number | null>(null);
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
      status: table.status,
      orderValue: table.orderValue ?? "",
    });
    setIsFormOpen(true);
  };

  const saveTable = (event: FormSubmitEvent) => {
    event.preventDefault();
    const name = tableForm.name.trim();
    const hasAccount = tableForm.status !== "available";
    setTables((current) => {
      if (editingTableId !== null)
        return current.map((table) =>
          table.id === editingTableId
            ? {
                ...table,
                name,
                status: tableForm.status,
                orderValue: hasAccount
                  ? tableForm.orderValue || "R$ 0,00"
                  : undefined,
                order: hasAccount ? (table.order ?? []) : undefined,
              }
            : table,
        );
      const id = Math.max(0, ...current.map((table) => table.id)) + 1;
      return [
        ...current,
        {
          id,
          name,
          status: tableForm.status,
          orderValue: hasAccount
            ? tableForm.orderValue || "R$ 0,00"
            : undefined,
          order: hasAccount ? [] : undefined,
        },
      ];
    });
    closeForm();
  };
  const deleteTable = () => {
    if (!tableToDelete) return;
    setTables((current) =>
      current.filter((table) => table.id !== tableToDelete.id),
    );
    setTableToDelete(null);
    setSelectedTable(null);
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
              Abrir mesa
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
            Livres{" "}
            <span>
              {tables.filter((table) => table.status === "available").length}
            </span>
          </button>
          <button
            type="button"
            className={statusFilter === "occupied" ? "active" : ""}
            onClick={() => setStatusFilter("occupied")}
          >
            Ocupadas{" "}
            <span>
              {tables.filter((table) => table.status === "occupied").length}
            </span>
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
                    setSelectedTable(table);
                    setSelectedDetail(null);
                  }}
                  aria-label={`Ver detalhes da ${table.name}`}
                >
                  <div className="table-card-topline">
                    <strong className="table-number">
                      {String(table.id).padStart(2, "0")}
                    </strong>
                    <span className={`table-status ${table.status}`}>
                      {statusInfo[table.status].label}
                    </span>
                  </div>
                  <div className="table-card-info">
                    <h3>{table.name}</h3>
                    <p>{statusInfo[table.status].description}</p>
                  </div>
                </button>
                <footer className="table-card-value">
                  <span>Valor atual</span>
                  <strong>{table.orderValue ?? "R$ 0,00"}</strong>
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
              {selectedDetail === null && (
                <div className="table-options">
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
                      Esta mesa ainda não possui pedido.
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
                    acompanhar o pedido.
                  </p>
                  <VisualQrCode />
                  <small>mesaflow.app/mesa/{selectedTable.id}</small>
                  <Button type="button" variant="secondary">
                    <Download aria-hidden="true" />
                    Instalar
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
                label="Nome ou número da mesa"
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
              <label className="table-status-field">
                <span>Status da mesa</span>
                <select
                  value={tableForm.status}
                  onChange={(event) =>
                    setTableForm((current) => ({
                      ...current,
                      status: event.target.value as TableStatus,
                    }))
                  }
                >
                  <option value="available">Livre</option>
                  <option value="occupied">Ocupada</option>
                  <option value="awaiting_payment">Aguardando pagamento</option>
                </select>
              </label>
              {tableForm.status !== "available" && (
                <TextField
                  label="Valor atual da conta"
                  required
                  placeholder="Ex.: R$ 86,40"
                  value={tableForm.orderValue}
                  onChange={(event) =>
                    setTableForm((current) => ({
                      ...current,
                      orderValue: event.target.value,
                    }))
                  }
                />
              )}
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
                  <Button type="submit">
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
              <Button type="button" variant="danger" onClick={deleteTable}>
                Excluir
              </Button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
