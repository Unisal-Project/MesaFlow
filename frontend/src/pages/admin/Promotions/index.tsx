import { useState } from "react";
import { Search } from "lucide-react";
import {
  AdminSidebar,
  Badge,
  Button,
  Checkbox,
  EmptyState,
  Notifications,
  SkeletonCard,
  SystemMessage,
  Tabs,
} from "@/components";
import logoAlternativo from "@/assets/logotipo/logo_alternativo-2.png";
import { promotionLabel, type PromoFields } from "@/utils/promotion";
import { usePromotions, type ItemKey } from "./hooks/usePromotions";
import { promotionStatus } from "./promotionStatus";
import { PromotionPanel } from "./PromotionPanel";
import { isRowAreaClick } from "@/utils/selectableRow";
import "./styles.scss";

type PromotionsProps = { onNavigate: (id: string) => void };
const filters = [
  { id: "all", label: "Todos" },
  { id: "active", label: "Vigentes" },
  { id: "scheduled", label: "Agendadas" },
  { id: "paused", label: "Pausadas" },
  { id: "none", label: "Sem promoção" },
];
const statusNames = {
  active: "Vigente",
  scheduled: "Agendada",
  paused: "Pausada",
};
const money = (value: string) =>
  Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const period = (promo: Partial<PromoFields>) => {
  const date = (iso: string) =>
    new Date(iso).toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  return (
    [
      promo.promoStartsAt && `a partir de ${date(promo.promoStartsAt)}`,
      promo.promoEndsAt && `até ${date(promo.promoEndsAt)}`,
    ]
      .filter(Boolean)
      .join(" · ") || "sem prazo"
  );
};
function statusBadge(promo: Partial<PromoFields>) {
  const status = promotionStatus(promo);
  if (!status) return null;
  return (
    <Badge
      variant={
        status === "active"
          ? "success"
          : status === "scheduled"
            ? "info"
            : "closed"
      }
    >
      {statusNames[status]}{" "}
      {promotionLabel({ type: promo.promoType!, value: promo.promoValue! })}
    </Badge>
  );
}

export default function Promotions(props: PromotionsProps) {
  const state = usePromotions();
  return <PromotionsContent {...props} state={state} />;
}

export function PromotionsContent({ onNavigate, embedded = false, state: promotionState }: PromotionsProps & { embedded?: boolean; state: ReturnType<typeof usePromotions> }) {
  const { feedbackRef, ...state } = promotionState;
  const Container = embedded ? "section" : "main";
  const Heading = embedded ? "h2" : "h1";
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const rows = [...state.products, ...state.categories];
  const matchesStatus = (item: Partial<PromoFields>, id = filter) =>
    id === "all" || (promotionStatus(item) ?? "none") === id;
  const query = search.trim().toLocaleLowerCase("pt-BR");
  const groups = [
    ...state.categories,
    ...(state.products.some(
      (product) =>
        !state.categories.some(
          (category) => category.id === product.categoryId,
        ),
    )
      ? [{ id: "", name: "Sem categoria", promoType: null }]
      : []),
  ]
    .map((category) => ({
      category,
      products: state.products.filter((product) =>
        category.id
          ? product.categoryId === category.id
          : !state.categories.some((c) => c.id === product.categoryId),
      ),
    }))
    .map((group) => ({
      ...group,
      visible: group.products.filter(
        (product) =>
          matchesStatus(product) &&
          `${product.name} ${group.category.name}`
            .toLocaleLowerCase("pt-BR")
            .includes(query),
      ),
      showCategory:
        matchesStatus(group.category) &&
        group.category.name.toLocaleLowerCase("pt-BR").includes(query),
    }))
    .filter((group) => group.visible.length || group.showCategory);
  const select = (key: ItemKey, label: string) => (
    <Checkbox
      label={label}
      checked={state.selected.includes(key)}
      disabled={state.busy}
      onChange={() => state.toggle(key)}
    />
  );
  const showActions = !!(state.selected.length || state.error || state.notice);
  return (
    <div className={`promotions-page${embedded ? " promotions-embedded" : ""}${showActions ? " has-actions" : ""}`}>
      {!embedded && <AdminSidebar
        activeId="promotions"
        brandSubtitle="GESTÃO DO RESTAURANTE"
        navigationLabel="MENU PRINCIPAL"
        showAvatar
        brandImage={<img src={logoAlternativo} alt="" />}
        onChange={onNavigate}
      />}
      <Container className="promotions-content">
        {!embedded && <header className="promotions-topbar">
          <div className="promotions-breadcrumb" aria-label="Página atual">
            <span>Visão geral</span>
            <strong>/ &nbsp;Promoções</strong>
          </div>
          <Notifications />
        </header>}
        <div className="promotions-body">
          <header className="promotions-heading">
            <Heading>Promoções</Heading>
            <p>Coloque produtos ou categorias inteiras em promoção.</p>
          </header>
          <div className="promotions-filters">
            <Tabs
              ariaLabel="Filtrar promoções"
              activeId={filter}
              onChange={setFilter}
              items={filters.map((item) => ({
                ...item,
                label: `${item.label} ${state.loading ? "—" : rows.filter((row) => matchesStatus(row, item.id)).length}`,
              }))}
            />
            <label className="product-search promotions-search">
              <Search aria-hidden="true" />
              <input
                type="search"
                aria-label="Buscar produto ou categoria"
                placeholder="Buscar produto ou categoria..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
          </div>
          {state.loading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : state.loadError ? (
            <div>
              <SystemMessage variant="error">{state.loadError}</SystemMessage>
              <Button
                type="button"
                variant="secondary"
                onClick={() => void state.reload()}
              >
                Tentar de novo
              </Button>
            </div>
          ) : !state.products.length ? (
            <EmptyState
              title="Nenhum produto no cardápio."
              description="Cadastre produtos para definir promoções."
              action={
                <Button onClick={() => onNavigate("menu")}>
                  Cadastrar produtos
                </Button>
              }
            />
          ) : !groups.length ? (
            <EmptyState
              title={
                search
                  ? "Nenhum resultado para a busca."
                  : filter === "active"
                    ? "Nenhuma promoção vigente."
                    : "Nenhum resultado para este filtro."
              }
              description="Experimente outro filtro ou busca."
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setFilter("all");
                    setSearch("");
                  }}
                >
                  Ver todos
                </Button>
              }
            />
          ) : (
            groups.map(({ category, products, visible }) => (
              <section
                key={category.id}
                className="promotions-group"
                aria-label={category.name}
              >
                <header className="promotions-group-heading">
                  <div>
                    <h2>{category.name}</h2>
                    <small>
                      {products.length}{" "}
                      {products.length === 1 ? "item" : "itens"}
                    </small>
                  </div>
                  {category.id && (
                    <div className="promotions-category">
                      {select(`c:${category.id}`, "Toda a categoria")}
                      {statusBadge(category)}
                      {promotionStatus(category) && (
                        <small>{period(category)}</small>
                      )}
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={state.busy || !visible.length}
                    aria-label={`Marcar todos os produtos: ${category.name}`}
                    onClick={() =>
                      state.selectAll(
                        visible.map((product) => `p:${product.id}` as ItemKey),
                      )
                    }
                  >
                    Marcar todos os produtos
                  </Button>
                </header>
                <ul className="products-list">
                  {visible.map((product) => (
                    <li
                      key={product.id}
                      className={`product-row promotions-product-row selectable-row${state.selected.includes(`p:${product.id}`) ? " is-selected" : ""}`}
                      onClick={(event) => {
                        if (!state.busy && isRowAreaClick(event)) state.toggle(`p:${product.id}`);
                      }}
                    >
                      {select(`p:${product.id}`, product.name)}
                      {product.imageUrl && (
                        <img src={product.imageUrl} alt="" loading="lazy" />
                      )}
                      <div className="promotions-product-details">
                        <p className="promotions-price">
                          {product.promotion && (
                            <del className="product-card-old-price">
                              {money(product.price)}
                            </del>
                          )}
                          <span>
                            {money(product.finalPrice ?? product.price)}
                          </span>
                        </p>
                        <div className="promotions-meta">
                          {statusBadge(product)}
                          {product.promotion?.source === "CATEGORY" && (
                            <Badge variant="warning">
                              via categoria {promotionLabel(product.promotion)}
                            </Badge>
                          )}
                          {promotionStatus(product) && (
                            <small>{period(product)}</small>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
        {showActions && (
          <div
            className="promotions-selection-bar"
            aria-label="Ações da seleção"
          >
            <div className="promotions-selection-actions">
              <span role="status">
                {state.selected.length}{" "}
                {state.selected.length === 1 ? "selecionado" : "selecionados"}
              </span>
              <Button
                type="button"
                variant="secondary"
                disabled={state.busy || !state.selected.length}
                onClick={state.clearSelection}
              >
                Limpar
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={state.busy || !state.selected.length}
                onClick={state.pause}
              >
                Pausar
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={state.busy || !state.canResume}
                aria-describedby={
                  state.resumeHint ? "promotions-resume-hint" : undefined
                }
                onClick={state.resume}
              >
                Retomar
              </Button>
              <Button
                type="button"
                variant="danger"
                disabled={state.busy || !state.replacedCount}
                onClick={state.removePromotion}
              >
                Remover promoção
              </Button>
              <Button
                type="button"
                disabled={state.busy || !state.selected.length}
                onClick={state.openPanel}
              >
                Definir promoção
              </Button>
            </div>
            {state.resumeHint && (
              <small id="promotions-resume-hint">{state.resumeHint}</small>
            )}
            {!state.panelOpen && (
              <div ref={feedbackRef} className="promotions-feedback">
                {state.error && (
                  <SystemMessage variant="error">{state.error}</SystemMessage>
                )}
                {state.notice && (
                  <SystemMessage variant="success">
                    {state.notice}
                  </SystemMessage>
                )}
              </div>
            )}
          </div>
        )}
      </Container>
      {state.panelOpen && (
        <PromotionPanel state={state} feedbackRef={feedbackRef} />
      )}
    </div>
  );
}
