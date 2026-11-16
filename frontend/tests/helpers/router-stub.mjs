// react-router mínimo para rodar componentes com hooks controlados (sem Router).
export const navigations = [];
export const useNavigate = () => (to) => navigations.push(to);
export const useSearchParams = () => [new URLSearchParams()];
export const Outlet = () => null;
