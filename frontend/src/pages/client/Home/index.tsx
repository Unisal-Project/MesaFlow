import { ShoppingCart, Sparkles } from "lucide-react";
import { Button, ClientHeader, TextField } from "@/components";
import { useCart } from "@/contexts/useCart";
import { mockRestaurant } from "./mocks/home.mocks";
import "./styles.scss";

type HomeProps = {
  guestName: string;
  onGuestNameChange: (name: string) => void;
  onExploreMenu: () => void;
  onOpenCart: () => void;
};

export function Home({ guestName, onGuestNameChange, onExploreMenu, onOpenCart }: HomeProps) {
  const table = new URLSearchParams(window.location.search).get("mesa")?.trim() || "12";
  const tableLabel = /^mesa\s/i.test(table) ? table : `Mesa ${table}`;
  const { itemCount } = useCart();

  return (
    <div className="client-home">
      <ClientHeader title="MesaFlow" subtitle={tableLabel} cartAction={
        <button type="button" className="client-home-cart" aria-label={`Abrir carrinho, ${itemCount} ${itemCount === 1 ? "item" : "itens"}`} onClick={onOpenCart}>
          <ShoppingCart aria-hidden="true" /><span aria-hidden="true">{itemCount}</span>
        </button>
      } />
      <div className="client-home-banner" aria-label={tableLabel}>
        <span>{tableLabel}</span>
      </div>
      <main className="client-home-content">
        <p className="client-home-eyebrow">Bem-vindo à mesa</p>
        <h1>Seu momento<br />começa aqui.</h1>
        <p className="client-home-description">Descubra os sabores da casa e peça diretamente da sua mesa, sem complicação.</p>
        <form className="client-home-form" onSubmit={(event) => { event.preventDefault(); onExploreMenu(); }}>
          <TextField id="client-guest-name" label="Insira seu nome na mesa (opcional)" autoComplete="given-name" maxLength={80}
            value={guestName} onChange={(event) => onGuestNameChange(event.target.value)} />
          <div className="client-home-restaurant">
            <span className="client-home-restaurant-icon"><Sparkles aria-hidden="true" /></span>
            <div><strong>{mockRestaurant.name}</strong><p>Atendimento · {mockRestaurant.location}</p></div>
          </div>
          <Button type="submit">Explorar cardápio</Button>
        </form>
      </main>
      <footer className="client-home-footer">Tecnologia para bons encontros.</footer>
    </div>
  );
}
