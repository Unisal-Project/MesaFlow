import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Download, QrCode } from "lucide-react";
import { Button } from "@/components";
import type { RestaurantTable } from "../types/table.types";

export function MockTableQr({ table }: { table: RestaurantTable }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const menuUrl = new URL("/cardapio", window.location.origin);
    menuUrl.searchParams.set("mesa", String(table.number));
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, table.menuUrl || menuUrl.toString(), {
        width: 240,
        margin: 2,
      })
        .then(() => {
          if (!cancelled) setReady(true);
        })
        .catch(() => {
          if (!cancelled)
            setError("Não foi possível gerar a prévia do QR Code.");
        });
    }
    return () => {
      cancelled = true;
    };
  }, [table.menuUrl, table.number]);

  const download = () => {
    if (!ready || !canvasRef.current) return;
    const link = document.createElement("a");
    link.href = canvasRef.current.toDataURL("image/png");
    link.download = `mesa-${String(table.number).padStart(2, "0")}-demonstracao.png`;
    link.click();
  };

  return (
    <div className="table-qr-view">
      <QrCode aria-hidden="true" />
      <h3>QR Code da mesa</h3>
      <p>
        Prévia demonstrativa para {table.name}. O código abre o cardápio com a
        mesa identificada. O fluxo atual continua demonstrativo.
      </p>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`QR Code demonstrativo da mesa ${table.number}`}
      />
      {error && <p role="alert">{error}</p>}
      <Button
        type="button"
        variant="secondary"
        disabled={!ready}
        onClick={download}
      >
        <Download aria-hidden="true" />
        Baixar PNG
      </Button>
    </div>
  );
}
