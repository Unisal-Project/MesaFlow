import { BellIcon, BellRing } from "lucide-react";
import {
  findClosingRequestedAttendances,
  findCancelledAttendances,
  type ClosingRequestedAttendance,
  type CancelledResquestAttendance,
} from "@/services/attendance.service";
import { useEffect, useId, useRef, useState } from "react";
import "./style.scss";

export type NotificationItem = {
  id: string;
  status: string;
  closingRequestedAt: string;
  table: { number: number };
};

type NotificationsProps = { items?: NotificationItem[] };

export function Notifications({ items }: NotificationsProps = {}) {
  const [closingRequests, setClosingRequests] = useState<
    ClosingRequestedAttendance[]
  >([]);
  const [cancelledRequests, setCancelledRequests] = useState<
    CancelledResquestAttendance[]
  >([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const panelId = useId();
  const bellRef = useRef<SVGSVGElement>(null);
  const previousKeys = useRef(new Set<string>());
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!notificationsOpen) return;
    const closeOutside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !containerRef.current?.contains(event.target)
      ) {
        setNotificationsOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setNotificationsOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [notificationsOpen]);

  useEffect(() => {
    if (items !== undefined) return;
    const fetchClosingRequests = async () => {
      try {
        const requests = await findClosingRequestedAttendances();
        setClosingRequests(requests);
      } catch (error) {
        console.error("Erro ao buscar solicitações de fechamento:", error);
      }
    };
    fetchClosingRequests();

    const interval = setInterval(fetchClosingRequests, 5000); // Atualiza a cada 5 segundos

    return () => clearInterval(interval); // Limpa o intervalo ao desmontar o componente
  }, [items]);

  useEffect(() => {
    if (items !== undefined) return;
    const fetchCancelledRequests = async () => {
      try {
        const requests = await findCancelledAttendances();
        setCancelledRequests(requests);
      } catch (error) {
        console.error("Erro ao buscar solicitações canceladas:", error);
      }
    };
    fetchCancelledRequests();

    const interval = setInterval(fetchCancelledRequests, 5000); // Atualiza a cada 5 segundos

    return () => clearInterval(interval); // Limpa o intervalo ao desmontar o componente
  }, [items]);

  const notifications = [
    ...(items ?? [...closingRequests, ...cancelledRequests]),
  ].sort(
    (a, b) =>
      new Date(b.closingRequestedAt).getTime() -
      new Date(a.closingRequestedAt).getTime(),
  );

  const notificationKeys = JSON.stringify(notifications.map((item) => `${item.status}-${item.id}-${item.closingRequestedAt}`));
  const hasNotifications = notifications.length > 0;
  const Bell = hasNotifications ? BellRing : BellIcon;

  useEffect(() => {
    const keys: string[] = JSON.parse(notificationKeys);
    const hasNewNotification = keys.some((key) => !previousKeys.current.has(key));
    let animation: Animation | undefined;
    const frame = requestAnimationFrame(() => {
      previousKeys.current = new Set(keys);
      if (!hasNewNotification || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      animation = bellRef.current?.animate([
        { transform: "rotate(0deg)" },
        { transform: "rotate(18deg)" },
        { transform: "rotate(-16deg)" },
        { transform: "rotate(12deg)" },
        { transform: "rotate(-8deg)" },
        { transform: "rotate(0deg)" },
      ], { duration: 700, easing: "ease-in-out" });
    });
    return () => {
      cancelAnimationFrame(frame);
      animation?.cancel();
    };
  }, [notificationKeys]);

  return (
    <div className="notifications-container" ref={containerRef}>
      <button
        ref={buttonRef}
        type="button"
        className="notifications-button"
        onClick={() => setNotificationsOpen((open) => !open)}
        aria-controls={panelId}
        aria-expanded={notificationsOpen}
        aria-label={hasNotifications ? `Notificações, ${notifications.length} pendentes` : "Notificações"}
      >
        <Bell ref={bellRef} size={24} aria-hidden="true" />
        {notifications.length > 0 && (
          <span className="notification-badge">{notifications.length}</span>
        )}
      </button>
      {notificationsOpen && (
        <div
          id={panelId}
          className="notifications-panel"
          role="region"
          aria-label="Notificações"
        >
          <h3>Notificações</h3>
          {notifications.length === 0 ? (
            <p>Nenhuma notificação no momento.</p>
          ) : (
            <ul>
              {notifications.map((request) => (
                <li
                  key={`${request.status}-${request.id}`}
                  className={`notification-item ${request.status === "CANCELLED" ? "notification-item--cancelled" : "notification-item--closing"}`}
                >
                  <span className="notification-type">
                    {request.status === "CANCELLED"
                      ? "Solicitação cancelada"
                      : "Fechamento solicitado"}
                  </span>
                  <strong>Mesa {request.table.number}</strong>
                  <time dateTime={request.closingRequestedAt}>
                    {new Date(request.closingRequestedAt).toLocaleString(
                      "pt-BR",
                    )}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
