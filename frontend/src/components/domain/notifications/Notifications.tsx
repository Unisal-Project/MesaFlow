import { Button } from "@/components/ui/buttons/Button";
import { attendWaiterCall } from "@/services/waiter-calls.service";
import { BellIcon, BellRing } from "lucide-react";
import { useAttendanceNotifications } from "@/hooks/useAttendanceNotifications";
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
  const attendanceNotifications = useAttendanceNotifications(items === undefined);
  const [attendingId, setAttendingId] = useState<string | null>(null);
  const [attendError, setAttendError] = useState<string | null>(null);
  const [attendedIds, setAttendedIds] = useState<Set<string>>(() => new Set());
  async function handleAttend(id: string) {
    if (attendingId) return;
    setAttendingId(id);
    setAttendError(null);
    try {
      await attendWaiterCall(id);
      setAttendedIds((current) => new Set([...current, id]));
    } catch (reason) {
      setAttendError(reason instanceof Error ? reason.message : "Não foi possível atender a solicitação.");
    } finally { setAttendingId(null); }
  }
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

  const notifications = [
    ...(items ?? attendanceNotifications),
  ].filter((item) => item.status !== "WAITER_CALL" || !attendedIds.has(item.id)).sort(
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
          {attendError && <p role="alert">{attendError}</p>}
          {notifications.length === 0 ? (
            <p>Nenhuma notificação no momento.</p>
          ) : (
            <ul>
              {notifications.map((request) => (
                <li
                  key={`${request.status}-${request.id}`}
                  className={`notification-item ${request.status === "WAITER_CALL" ? "notification-item--waiter" : request.status === "CANCELLED" ? "notification-item--cancelled" : "notification-item--closing"}`}
                >
                  <span className="notification-type">
                    {request.status === "WAITER_CALL" ? "Chamada de garçom" : request.status === "CANCELLED"
                      ? "Solicitação cancelada"
                      : "Fechamento solicitado"}
                  </span>
                  <strong>{request.status === "WAITER_CALL" ? `Mesa ${String(request.table.number).padStart(2, "0")} solicitou um garçom` : `Mesa ${request.table.number}`}</strong>
                  <time dateTime={request.closingRequestedAt}>
                    {new Date(request.closingRequestedAt).toLocaleString(
                      "pt-BR",
                    )}
                  </time>
                  {request.status === "WAITER_CALL" && <Button variant="secondary" onClick={() => handleAttend(request.id)} loading={attendingId === request.id} disabled={attendingId !== null}>Marcar como atendida</Button>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
