import { useContentTransition } from "@/layouts/hooks/useContentTransition";
import { Armchair, Plus, Search } from "lucide-react";

import { Button, Notifications, AdminSidebar } from "@/components";

import { DeleteTableModal } from "./components/DeleteTableModal";
import { TableFormModal } from "./components/TableFormModal";
import { TableDetailsModal } from "./components/TableDetailsModal";
import { TableCard } from "./components/TableCard";

import type { TablesProps } from "./types/table.types";

import logoAlternativo from "@/assets/logotipo/logo_alternativo-2.png";
import { TablesSummary } from "./components/TablesSummary";

import { findActiveTableOrder } from "./utils/table.utils";

import "./styles.scss";

export default function Tables({
  onNavigate,
  state,
  orders,
  onViewOrder,
}: TablesProps) {
  const { contentRef, transitionContent } = useContentTransition();
  const {
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
  } = state;

  const activeOrder = selectedTable
    ? findActiveTableOrder(selectedTable, orders)
    : undefined;

  return (
    <div className="tables-page">
      <AdminSidebar
        activeId="tables"
        brandSubtitle="GESTÃO DO RESTAURANTE"
        navigationLabel="MENU PRINCIPAL"
        showAvatar
        brandImage={<img src={logoAlternativo} alt="" />}
        onChange={onNavigate ?? (() => undefined)}
        userName="Nome do usuário"
        userRole="Administrador"
      />
      <main className="tables-content">
        <div className="tables-topbar">
          <div className="tables-breadcrumb" aria-label="Página atual">
            <span>Visão geral</span>
            <strong>/ &nbsp;Mesas</strong>
          </div>
          <div className="tables-topbar-actions">
            <label className="table-search">
              <Search aria-hidden="true" />
              <input
                type="search"
                aria-label="Pesquisar mesa"
                placeholder="Buscar mesa por nome ou número"
                enterKeyHint="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </label>
            <Notifications
              items={tables
                .filter((table) => table.closingRequestedAt)
                .map((table) => ({
                  id: table.id,
                  status: "CLOSING_REQUESTED",
                  closingRequestedAt: table.closingRequestedAt!,
                  table: { number: table.number },
                }))}
            />
          </div>
        </div>
        <div className="tables-body">
          <header className="tables-heading">
            <div>
              <h1>Mesas</h1>
              <p>Visualize a ocupação e acompanhe os atendimentos.</p>
            </div>
            <Button onClick={openNewTable}>
              <Plus aria-hidden="true" />
              Adicionar mesa
            </Button>
          </header>
          {error && (
            <p className="tables-error" role="alert">
              {error}
            </p>
          )}
          {loading && (
            <p className="tables-loading" role="status">
              Carregando mesas…
            </p>
          )}
          <TablesSummary tables={tables} loading={loading} />
          <div className="tables-toolbar">
            <nav
              className="table-status-tabs"
              aria-label="Filtrar mesas por status"
            >
              <button
                type="button"
                aria-pressed={statusFilter === "all"}
                className={statusFilter === "all" ? "active" : ""}
                onClick={() => transitionContent(() => setStatusFilter("all"))}
              >
                Todas <span>{tables.length}</span>
              </button>
              <button
                type="button"
                aria-pressed={statusFilter === "available"}
                className={statusFilter === "available" ? "active" : ""}
                onClick={() =>
                  transitionContent(() => setStatusFilter("available"))
                }
              >
                Disponíveis{" "}
                <span>
                  {
                    tables.filter((table) => table.status === "available")
                      .length
                  }
                </span>
              </button>
              <button
                type="button"
                aria-pressed={statusFilter === "occupied"}
                className={statusFilter === "occupied" ? "active" : ""}
                onClick={() =>
                  transitionContent(() => setStatusFilter("occupied"))
                }
              >
                Ocupadas{" "}
                <span>
                  {tables.filter((table) => table.status === "occupied").length}
                </span>
              </button>
              <button
                type="button"
                aria-pressed={statusFilter === "closing_requested"}
                className={statusFilter === "closing_requested" ? "active" : ""}
                onClick={() =>
                  transitionContent(() => setStatusFilter("closing_requested"))
                }
              >
                Conta solicitada{" "}
                <span>
                  {
                    tables.filter(
                      (table) =>
                        table.status === "closing_requested" ||
                        table.status === "awaiting_payment",
                    ).length
                  }
                </span>
              </button>
            </nav>
            <label className="table-search table-search-map">
              <Search aria-hidden="true" />
              <input
                type="search"
                aria-label="Buscar número da mesa"
                placeholder="Buscar número da mesa"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </label>
          </div>
          <section className="tables-list" aria-labelledby="tables-list-title">
            <header className="tables-list-heading">
              <div>
                <h2 id="tables-list-title">Mapa de mesas</h2>
                <p>
                  {normalizedSearch || statusFilter !== "all"
                    ? `${filteredTables.length} de ${tables.length} mesas`
                    : "Selecione uma mesa para ver os detalhes do atendimento."}
                </p>
              </div>
            </header>
            <div className="tables-grid" ref={contentRef}>
              {filteredTables.map((table) => (
                <TableCard
                  key={table.id}
                  table={table}
                  onSelect={(selectedTable) => {
                    setError("");
                    setSelectedTable(selectedTable);
                    setSelectedDetail(null);
                  }}
                />
              ))}

              {!loading && !error && filteredTables.length === 0 && (
                <div className="tables-no-results">
                  <Armchair aria-hidden="true" />
                  <p>Nenhuma mesa encontrada para os filtros selecionados.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      {selectedTable && (
        <TableDetailsModal
          table={selectedTable}
          activeOrder={activeOrder}
          onViewOrder={(orderId) => {
            setSelectedTable(null);
            setSelectedDetail(null);
            onViewOrder(orderId);
          }}
          selectedDetail={selectedDetail}
          setSelectedDetail={setSelectedDetail}
          error={error}
          busy={busy}
          onClose={() => setSelectedTable(null)}
          onEdit={openEditTable}
          onAdvanceStatus={advanceStatus}
        />
      )}

      {isFormOpen && (
        <TableFormModal
          editingTableId={editingTableId}
          tableForm={tableForm}
          setTableForm={setTableForm}
          tables={tables}
          error={error}
          busy={busy}
          onClose={closeForm}
          onSave={saveTable}
          onDelete={setTableToDelete}
        />
      )}

      {tableToDelete && (
        <DeleteTableModal
          table={tableToDelete}
          error={error}
          busy={busy}
          onClose={() => setTableToDelete(null)}
          onConfirm={deleteTable}
        />
      )}
    </div>
  );
}
