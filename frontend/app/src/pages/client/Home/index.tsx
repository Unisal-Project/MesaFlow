import { Button, ClientHeader } from "@/components";
import "./styles.css";

export function Home(){
    const parametro = new URLSearchParams(window.location.search);
    const numMesa = parametro.get("mesa")?? "";
    const cartCont =0;
    const RestautranteName= "Casa terracota";
    const local = "salão principal";

    return(
        <div className="mf-screen">
           <ClientHeader title={RestautranteName}
           cartAction={<Button>{cartCont}</Button>}
           />
            <div className="banner">
                <span>{numMesa}</span>
                </div>
            <div className="content">
            <div className="hellcome">
                Bem-Vindo
            </div>
        <h1>
             Peça Direto da sua Mesa.
        </h1>
        <p>
            Explore o cardápio, personalize seu Pedido e acompanhe todo o preparo sem sair do lugar.
        </p>

      <div className="info-card">
        <div className="info-item">
            <span>Restaurante</span>
            <strong>{RestautranteName}</strong>
        </div>
        <div className="info-item">
            <span>Atendimento</span>
            <strong>{local}</strong>
        </div>
      </div>
        
       <Button variant="primary" onClick={() => {}}>
        Ver Cardápio
       </Button>
            </div>
        </div>
    );
}
























