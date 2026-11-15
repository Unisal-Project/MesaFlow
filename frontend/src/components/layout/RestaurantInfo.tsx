import { useId, useRef, useState } from "react";
import { Info } from "lucide-react";
import { Button } from "@/components";
import { fetchPublicSettings, type PublicRestaurantSettings } from "@/services/settings.service";
import "./restaurantInfo.scss";

export type RestaurantDetails = Partial<PublicRestaurantSettings>;

export function RestaurantInfo({ details }: { details?: RestaurantDetails }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [fetched, setFetched] = useState<PublicRestaurantSettings>();
  const info = details ?? fetched;
  const open = async () => {
    dialog.current?.showModal();
    if (details) return;
    try { setFetched(await fetchPublicSettings()); } catch { /* Campos ausentes continuam como Não informado. */ }
  };
  return <>
    <button type="button" className="restaurant-info-button" aria-label="Informações do restaurante" aria-haspopup="dialog" onClick={open}>
      <Info aria-hidden="true" />
    </button>
    <dialog ref={dialog} className="restaurant-info-dialog" aria-labelledby={titleId}>
      <h2 id={titleId}>Informações do restaurante</h2>
      <dl>
        <dt>Nome</dt><dd>{info?.name || "Não informado"}</dd>
        <dt>Endereço</dt><dd>{info?.address || "Não informado"}</dd>
        <dt>Horário de funcionamento</dt><dd>{info?.openingHours || "Não informado"}</dd>
        <dt>Contato</dt><dd>{info?.contact || "Não informado"}</dd>
      </dl>
      <Button onClick={() => dialog.current?.close()}>Fechar</Button>
    </dialog>
  </>;
}
