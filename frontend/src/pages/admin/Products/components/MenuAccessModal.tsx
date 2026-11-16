import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import QRCode from "qrcode";
import { ExternalLink, QrCode, X } from "lucide-react";
import { Button } from "@/components";

export function MenuAccessModal({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const url = new URL("/cardapio", window.location.origin).href;
  const localOnly = ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);
  const [image, setImage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.showModal();
    return () => {
      document.body.style.overflow = overflow;
      previousFocus?.focus();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setImage("");
    setError("");
    QRCode.toDataURL(url, { width: 280, margin: 2, errorCorrectionLevel: "M" })
      .then((value) => { if (!cancelled) setImage(value); })
      .catch(() => { if (!cancelled) setError("Não foi possível gerar o QR Code. Você ainda pode abrir o cardápio no computador."); });
    return () => { cancelled = true; };
  }, [url]);

  return createPortal(
    <dialog ref={dialogRef} className="menu-access-modal"
      aria-labelledby="menu-access-title" aria-describedby="menu-access-description"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) {
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
      } }}>
      <header>
        <h2 id="menu-access-title"><QrCode aria-hidden="true" />Ver cardápio</h2>
        <Button variant="ghost" aria-label="Fechar" onClick={onClose}><X aria-hidden="true" /></Button>
      </header>
      <p id="menu-access-description">Escaneie o QR Code com a câmera do celular para abrir o cardápio.</p>
      <div className="menu-access-qr">
        {image ? <img src={image} width={280} height={280} alt="QR Code para abrir o cardápio" />
          : !error && <p role="status">Gerando QR Code…</p>}
      </div>
      {error && <p role="alert">{error}</p>}
      {localOnly && <p className="menu-access-hint">Para acessar pelo celular, abra o painel pelo endereço do site ou pelo IP do computador na mesma rede Wi-Fi.</p>}
      <footer>
        <Button onClick={() => window.open(url, "_blank", "noopener,noreferrer")}><ExternalLink aria-hidden="true" />Abrir no computador</Button>
      </footer>
    </dialog>, document.body,
  );
}
