import { useEffect, useRef, useState } from "react";
import { BellRing, X } from "lucide-react";
import type { NotificationItem } from "./Notifications";
import { notificationTarget, notificationTitle } from "@/hooks/useAttendanceNotifications";

// Some sozinho em 3 s (pausa enquanto o mouse ou o foco estão no aviso).
const NOTIFICATION_TOAST_DURATION_MS = 3000;

export function NotificationToast({ item, onDismiss, onOpen }: {
  item: NotificationItem;
  onDismiss: () => void;
  onOpen: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [exiting, setExiting] = useState(false);
  const dismissedRef = useRef(false);
  const paused = hovered || focused;
  const dismissRef = useRef(onDismiss);
  useEffect(() => { dismissRef.current = onDismiss; }, [onDismiss]);
  useEffect(() => {
    if (paused || exiting) return;
    const timer = setTimeout(() => setExiting(true), NOTIFICATION_TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [paused, exiting]);
  const finishExit = () => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    dismissRef.current();
  };
  useEffect(() => {
    if (!exiting) return;
    // Garante a remoção mesmo se a animação for interrompida pelo navegador.
    const timer = setTimeout(() => {
      if (!dismissedRef.current) {
        dismissedRef.current = true;
        dismissRef.current();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [exiting]);

  return <div className={`notification-toast${exiting ? " notification-toast--exiting" : ""}`}
    inert={exiting}
    onAnimationEnd={(event) => {
      if (event.target === event.currentTarget && event.animationName === "notification-toast-out") finishExit();
    }}
    onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    onFocus={() => setFocused(true)}
    onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
    <a href={notificationTarget(item)} onClick={onOpen}>
      <BellRing aria-hidden="true" />
      <span><strong>{notificationTitle(item)}</strong><span>Mesa {String(item.table.number).padStart(2, "0")} · Toque para ver detalhes</span></span>
    </a>
    <button type="button" aria-label="Fechar aviso" onClick={() => setExiting(true)}><X aria-hidden="true" /></button>
  </div>;
}
