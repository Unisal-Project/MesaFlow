import { BellIcon } from "lucide-react";
import { 
    findClosingRequestedAttendances, 
    findCancelledAttendances,
    type ClosingRequestedAttendance,
    type CancelledResquestAttendance,
} from "../../services/attendance.service";
import { useEffect, useId, useState } from "react";
import "./style.css";

export function Notifications() {
    const [closingRequests, setClosingRequests] = useState<ClosingRequestedAttendance[]>([]);
    const [cancelledRequests, setCancelledRequests] = useState<CancelledResquestAttendance[]>([]);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const panelId = useId();
    
    useEffect(() => {
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
    }, []);

    useEffect(() => {
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
    }, []);

    const notifications = [...closingRequests, ...cancelledRequests].sort(
        (a, b) => new Date(b.closingRequestedAt).getTime() - new Date(a.closingRequestedAt).getTime(),
    );

    return (
        <div className="notifications-container">
            <button
                className="notifications-button"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                aria-controls={panelId}
                aria-expanded={notificationsOpen}
                aria-label="Notificações"
            >
                <BellIcon size={24} />
                {notifications.length > 0 && (
                    <span className="notification-badge">
                        {notifications.length}
                    </span>
                )}
            </button>
            {notificationsOpen && (
                <div id={panelId} className="notifications-panel">
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
                                        {request.status === "CANCELLED" ? "Solicitação cancelada" : "Fechamento solicitado"}
                                    </span>
                                    <strong>Mesa {request.table.number}</strong>
                                    <time dateTime={request.closingRequestedAt}>
                                        {new Date(request.closingRequestedAt).toLocaleString("pt-BR")}
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
