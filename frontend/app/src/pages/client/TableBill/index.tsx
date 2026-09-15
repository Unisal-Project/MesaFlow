import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Clock, Menu, ReceiptText, ShoppingCart } from "lucide-react";
import { Badge, BottomNavigation, Button, ClientHeader, IconButton, Radio, SystemMessage } from "@/components";
import { mockTableBill, type TableBillData } from "./data";
import "./styles.css";

export type BillClosingOption = "cashier" | "waiter" | "split";

type TableBillProps = {
  bill?: TableBillData;
  onBack?: () => void;
  onNavigate?: (destination: string) => void;
};

const closingOptions: { id: BillClosingOption; label: string }[] = [
  { id: "cashier", label: "Pagar no caixa" },
  { id: "waiter", label: "Chamar garçom" },
  { id: "split", label: "Dividir conta" },
];

const navigationItems = [
  { id: "menu", label: "Cardápio", icon: <Menu aria-hidden="true" /> },
  { id: "order", label: "Pedido", icon: <ShoppingCart aria-hidden="true" /> },
  { id: "status", label: "Status", icon: <Clock aria-hidden="true" /> },
  { id: "bill", label: "Conta", icon: <ReceiptText aria-hidden="true" /> },
];

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function TableBill({ bill = mockTableBill, onBack, onNavigate }: TableBillProps) {
  const [closingOption, setClosingOption] = useState<BillClosingOption>("cashier");
  const [closureRequested, setClosureRequested] = useState(false);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const isClosed = bill.status === "closed";
  const totalInCents = bill.orders.reduce((total, order) => total + order.amountInCents, bill.serviceInCents);

  useEffect(() => {
    if (closureRequested) {
      feedbackRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [closureRequested]);

  function handleNavigate(destination: string) {
    onNavigate?.(destination);
  }

  function handleRequestClose() {
    // Apenas confirmação visual. A integração com o backend será feita aqui depois.
    setClosureRequested(true);
  }

  return (
    <div className="table-bill-page">
      <ClientHeader
        title="MesaFlow"
        subtitle="Conta da mesa"
        backAction={
          <IconButton type="button" label="Voltar" onClick={onBack}>
            <ChevronLeft aria-hidden="true" />
          </IconButton>
        }
        cartAction={
          <IconButton
            type="button"
            label={`Carrinho, ${bill.cartItemCount} ${bill.cartItemCount === 1 ? "item" : "itens"}`}
            onClick={() => handleNavigate("order")}
          >
            <ShoppingCart aria-hidden="true" />
            <Badge variant="warning" className="table-bill-cart-count" aria-hidden="true">
              {bill.cartItemCount}
            </Badge>
          </IconButton>
        }
      />

      <main className="table-bill-main" aria-labelledby="table-bill-title">
        <div className="table-bill-heading">
          <h1 id="table-bill-title">Conta da mesa</h1>
          <Badge variant={bill.status}>{isClosed ? "Fechada" : "Aberta"}</Badge>
        </div>

        <section className="table-bill-summary" aria-label="Resumo da conta">
          <dl>
            {bill.orders.map((order) => (
              <div className="table-bill-row" key={order.id}>
                <dt>Pedido #{order.id}</dt>
                <dd>{currency.format(order.amountInCents / 100)}</dd>
              </div>
            ))}
            <div className="table-bill-row">
              <dt>Serviço</dt>
              <dd>{currency.format(bill.serviceInCents / 100)}</dd>
            </div>
            <div className="table-bill-row table-bill-total">
              <dt>Total da mesa</dt>
              <dd>{currency.format(totalInCents / 100)}</dd>
            </div>
          </dl>
        </section>

        <fieldset className="table-bill-options" aria-label="Opções para fechamento da conta" disabled={isClosed}>
          {closingOptions.map((option) => (
            <Radio
              key={option.id}
              className="table-bill-option"
              name="table-bill-closing-option"
              value={option.id}
              label={option.label}
              checked={closingOption === option.id}
              disabled={isClosed}
              onChange={() => setClosingOption(option.id)}
            />
          ))}
        </fieldset>

        <Button
          type="button"
          variant="primary"
          className="table-bill-close"
          disabled={isClosed}
          onClick={handleRequestClose}
        >
          Solicitar fechamento
        </Button>

        {closureRequested && (
          <div className="table-bill-feedback" ref={feedbackRef}>
            <SystemMessage variant="success">
              Solicitação enviada ao atendimento.
            </SystemMessage>
          </div>
        )}
      </main>

      <BottomNavigation items={navigationItems} activeId="bill" onChange={handleNavigate} />
    </div>
  );
}
