import { useClientTable } from "@/contexts/ClientTableContext";
import { ClientTableHeader } from "@/components/layout/ClientTableHeader";
import { Button,  TextField } from "@/components";
import "./styles.scss";

type HomeProps = {
  guestName: string;
  onGuestNameChange: (name: string) => void;
  onExploreMenu: () => void;
  onOpenCart: () => void;
};

export function Home({ guestName, onGuestNameChange, onExploreMenu }: HomeProps) {
  const { tableLabel } = useClientTable();

  return (
    <div className="client-home">
      <ClientTableHeader />
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
          <Button type="submit">Explorar cardápio</Button>
        </form>
      </main>
      <footer className="client-home-footer">Tecnologia para bons encontros.</footer>
    </div>
  );
}
