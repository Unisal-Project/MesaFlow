import { useId, useRef } from "react";
import { Info } from "lucide-react";
import { Button } from "@/components";
import "./restaurantInfo.scss";

// Preenchido futuramente pela fonte de informações públicas do restaurante.
export type RestaurantDetails = {
  name?: string;
  address?: string;
  openingHours?: string;
  contact?: string;
};

export function RestaurantInfo({ details }: { details?: RestaurantDetails }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  return <>
    <button type="button" className="restaurant-info-button" aria-label="Informações do restaurante" aria-haspopup="dialog" onClick={() => dialog.current?.showModal()}>
      <Info aria-hidden="true" />
    </button>
    <dialog ref={dialog} className="restaurant-info-dialog" aria-labelledby={titleId}>
      <h2 id={titleId}>Informações do restaurante</h2>
      <dl>
        <dt>Nome</dt><dd>{details?.name || "Não informado"}</dd>
        <dt>Endereço</dt><dd>{details?.address || "Não informado"}</dd>
        <dt>Horário de funcionamento</dt><dd>{details?.openingHours || "Não informado"}</dd>
        <dt>Contato</dt><dd>{details?.contact || "Não informado"}</dd>
      </dl>
      <Button onClick={() => dialog.current?.close()}>Fechar</Button>
    </dialog>
  </>;
}
