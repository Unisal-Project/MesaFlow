import { CalendarDays, Check, Hash } from "lucide-react";
import { Button } from "@/components";
import type { PaymentReceipt } from "@/services/payment-confirmation.service";
import "./styles.scss";

type PaymentConfirmationProps = PaymentReceipt & {
  onFinish: () => void;
};

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function focusTitle(heading: HTMLHeadingElement | null) {
  heading?.focus();
}

export function PaymentConfirmation({
  totalInCents,
  tableNumber,
  paidAt,
  restaurantName,
  timeZone,
  onFinish,
}: PaymentConfirmationProps) {
  const dateTime = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone,
  });
  return (
    <main className="payment-confirmation" aria-labelledby="payment-confirmation-title">
      <div className="payment-confirmation__content">
        <header className="payment-confirmation__header">
          <p className="payment-confirmation__restaurant">{restaurantName}</p>
          <span className="payment-confirmation__icon" aria-hidden="true">
            <Check />
          </span>
          <h1 id="payment-confirmation-title" tabIndex={-1} ref={focusTitle}>Pagamento confirmado!</h1>
          <p>Sua conta foi paga com sucesso.</p>
        </header>

        <dl className="payment-confirmation__receipt">
          <div className="payment-confirmation__total">
            <dt>Total pago</dt>
            <dd>{currency.format(totalInCents / 100)}</dd>
          </div>
          <div className="payment-confirmation__detail">
            <dt><Hash aria-hidden="true" /> Mesa</dt>
            <dd>{tableNumber}</dd>
          </div>
          <div className="payment-confirmation__detail">
            <dt><CalendarDays aria-hidden="true" /> Data e horário</dt>
            <dd><time dateTime={paidAt}>{dateTime.format(new Date(paidAt))}</time></dd>
          </div>
        </dl>

        <footer className="payment-confirmation__footer">
          <p>Agradecemos sua visita. Até a próxima!</p>
          <Button type="button" variant="primary" onClick={onFinish}>
            Finalizar
          </Button>
        </footer>
      </div>
    </main>
  );
}
