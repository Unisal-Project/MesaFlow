import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Download, QrCode } from "lucide-react";
import { Button } from "@/components";
import type { RestaurantTable } from "../types/table.types";
import { createPortal } from "react-dom";
import {
  qrLabel,
  withLabel,
  type QrTable,
} from "../utils/table.utils";

export function TableQr({ table }: { table: RestaurantTable }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  // Só o menuUrl do backend (com o token da mesa) é válido; sem ele, sem QR.
  const url = table.menuUrl;

  useEffect(() => {
    let cancelled = false;
    if (url && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, { width: 240, margin: 2 })
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
  }, [url]);

  const download = () => {
    if (!ready || !canvasRef.current) return;
    const link = document.createElement("a");
    link.href = withLabel(canvasRef.current, qrLabel(table.number)).toDataURL(
      "image/png",
    );
    link.download = `mesa-${String(table.number).padStart(2, "0")}.png`;
    link.click();
  };

  return (
    <div className="table-qr-view">
      <QrCode aria-hidden="true" />
      <h3>QR Code da mesa</h3>
      <p>
        QR Code de {table.name}. O código abre a tela de boas-vindas com a mesa
        identificada.
      </p>
      {url ? (
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`QR Code da mesa ${table.number}`}
        />
      ) : (
        <p role="status">QR indisponível para esta mesa.</p>
      )}
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

/**
 * Folha de impressão com o QR de cada mesa e o rótulo. Gera as imagens,
 * abre o diálogo de impressão e avisa quando terminou (onDone).
 * Montada só enquanto imprime; o pai a desmonta no onDone.
 */
export function TablesQrSheet({
  tables,
  onDone,
}: {
  tables: (QrTable & { id: string })[];
  onDone: (error?: string) => void;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [images, setImages] = useState<string[] | null>(null);
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  });
  const [urls] = useState(() => tables.map((table) => table.menuUrl));

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      urls.map((url) => QRCode.toDataURL(url, { width: 240, margin: 2 })),
    )
      .then((generated) => {
        if (!cancelled) setImages(generated);
      })
      .catch(() => {
        if (!cancelled) doneRef.current("Não foi possível gerar os QR Codes.");
      });
    return () => {
      cancelled = true;
    };
  }, [urls]);

  useEffect(() => {
    if (!images) return;
    // Espera as imagens decodificarem para não imprimir quadros vazios.
    const imgs = Array.from(sheetRef.current?.querySelectorAll("img") ?? []);
    void Promise.all(imgs.map((img) => img.decode().catch(() => undefined))).then(
      () => {
        window.print();
        doneRef.current();
      },
    );
  }, [images]);

  // Filha direta do body: na impressão o resto do body some com display:none.
  return createPortal(
    <div className="tables-print-sheet" ref={sheetRef} aria-hidden="true">
      {/* Sem margem de página o navegador não imprime cabeçalho/rodapé (título e URL).
          Só existe enquanto esta folha está montada: outras impressões não mudam. */}
      <style>{"@page { margin: 0; }"}</style>
      {images?.map((src, index) => (
        <figure key={tables[index].id}>
          <img src={src} alt="" />
          <figcaption>{qrLabel(tables[index].number)}</figcaption>
        </figure>
      ))}
    </div>,
    document.body,
  );
}
