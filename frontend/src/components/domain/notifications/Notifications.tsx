import { Button } from "@/components/ui/buttons/Button";
import { attendWaiterCall } from "@/services/waiter-calls.service";
import { BellIcon, BellRing } from "lucide-react";
import {
  dismissNotifications,
  markNotificationsRead,
  markOrderSeen,
  notificationKey,
  notificationTarget,
  notificationTitle,
  takeUnannouncedNotifications,
  unreadNotifications,
  useAttendanceNotifications,
  visibleNotifications,
} from "@/hooks/useAttendanceNotifications";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { NotificationToast } from "./NotificationToast";
import "./style.scss";

export type NotificationItem = {
  id: string;
  status: string;
  closingRequestedAt: string;
  table: { id?: string; number: number };
  tableId?: string;
  orderId?: string;
};

type NotificationsProps = { items?: NotificationItem[] };

export function Notifications({ items }: NotificationsProps = {}) {
  const attendanceNotifications = useAttendanceNotifications(items === undefined);
  const [attendingId, setAttendingId] = useState<string | null>(null);
  const [attendError, setAttendError] = useState<string | null>(null);
  const [attendedIds, setAttendedIds] = useState<Set<string>>(() => new Set());
  const [toasts, setToasts] = useState<NotificationItem[]>([]);
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

  // Lidas/limpas vivem no storage; o contador só força o novo render após gravar.
  const [, refreshStored] = useState(0);
  // Não lidas no momento em que o sino abriu: seguem destacadas enquanto ele está aberto.
  const [freshKeys, setFreshKeys] = useState<Set<string>>(() => new Set());
  const allNotifications = [
    ...(items ?? attendanceNotifications),
  ].filter((item) => item.status !== "WAITER_CALL" || !attendedIds.has(item.id));
  const notifications = visibleNotifications(allNotifications).sort(
    (a, b) =>
      new Date(b.closingRequestedAt).getTime() -
      new Date(a.closingRequestedAt).getTime(),
  );

  const notificationKeys = JSON.stringify(notifications.map((item) => `${item.status}-${item.id}-${item.closingRequestedAt}`));
  const unread = new Set(unreadNotifications(notifications).map(notificationKey));
  const hasNotifications = unread.size > 0;
  const Bell = hasNotifications ? BellRing : BellIcon;
  const toggleNotifications = () => {
    if (!notificationsOpen) {
      setFreshKeys(unread);
      markNotificationsRead(notifications);
      refreshStored((value) => value + 1);
    }
    setNotificationsOpen(!notificationsOpen);
  };
  const clearNotifications = () => {
    dismissNotifications(allNotifications);
    setToasts([]);
    refreshStored((value) => value + 1);
  };

  const openNotification = (item: NotificationItem) => {
    markNotificationsRead([...notifications.filter((entry) => !unread.has(notificationKey(entry))), item]);
    if (item.status === "NEW_ORDER") markOrderSeen(item.id);
    setNotificationsOpen(false);
  };

  useEffect(() => {
    const fresh = takeUnannouncedNotifications(unreadNotifications(notifications));
    const currentKeys = new Set(notifications.map(notificationKey));
    setToasts((current) => [
      ...current.filter((item) => currentKeys.has(notificationKey(item))),
      ...fresh.reverse(),
    ]);
    // As respostas do polling são objetos novos, mas só eventos novos geram avisos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notificationKeys]);

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
        onClick={toggleNotifications}
        aria-controls={panelId}
        aria-expanded={notificationsOpen}
        aria-label={hasNotifications ? `Notificações, ${unread.size} não lidas` : "Notificações"}
      >
        <Bell ref={bellRef} size={24} aria-hidden="true" />
        {hasNotifications && (
          <span className="notification-badge">{unread.size}</span>
        )}
      </button>
      {notificationsOpen && (
        <div
          id={panelId}
          className="notifications-panel"
          role="region"
          aria-label="Notificações"
        >
          <div className="notifications-panel-header">
            <h3>Notificações</h3>
            <button type="button" onClick={clearNotifications} disabled={notifications.length === 0}>
              Limpar notificações
            </button>
          </div>
          {attendError && <p role="alert">{attendError}</p>}
          {notifications.length === 0 ? (
            <p>Nenhuma notificação no momento.</p>
          ) : (
            <ul>
              {notifications.map((request) => (
                <li
                  key={`${request.status}-${request.id}`}
                  className={`notification-item${unread.has(notificationKey(request)) || freshKeys.has(notificationKey(request)) ? "" : " notification-item--read"} ${request.status === "WAITER_CALL" ? "notification-item--waiter" : request.status === "CANCELLED" ? "notification-item--cancelled" : "notification-item--closing"}`}
                >
                  <a className="notification-link" href={notificationTarget(request)} onClick={() => openNotification(request)}>
                    <span className="notification-type">{notificationTitle(request)}</span>
                    <strong>{request.status === "NEW_ORDER" ? `Mesa ${request.table.number} fez um pedido` : request.status === "WAITER_CALL" ? `Mesa ${String(request.table.number).padStart(2, "0")} solicitou um garçom` : `Mesa ${request.table.number}`}</strong>
                    <time dateTime={request.closingRequestedAt}>
                    {new Date(request.closingRequestedAt).toLocaleString(
                      "pt-BR",
                    )}
                    </time>
                    <span className="notification-link-action">Ver detalhes</span>
                  </a>
                  {request.status === "WAITER_CALL" && <Button variant="secondary" onClick={() => handleAttend(request.id)} loading={attendingId === request.id} disabled={attendingId !== null}>Marcar como atendida</Button>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {toasts.length > 0 && createPortal(
        <div className="notification-toasts" role="region" aria-label="Novas notificações" aria-live="polite" aria-relevant="additions">
          {toasts.slice(0, 3).map((item) => <NotificationToast key={notificationKey(item)} item={item}
            onDismiss={() => setToasts((current) => current.filter((entry) => notificationKey(entry) !== notificationKey(item)))}
            onOpen={() => openNotification(item)} />)}
        </div>, document.body,
      )}
    </div>
  );
}
