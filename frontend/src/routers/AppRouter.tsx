import { useEffect } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router";
import Login from "@/pages/admin/Login";
import { AdminRoutes } from "./AdminRoutes";
import { ClientRoutes } from "./ClientRoutes";

function LoginRoute() {
  const navigate = useNavigate();
  return <Login onEnter={() => navigate("/admin/dashboard")} />;
}

function EntryRoute() {
  const { search } = useLocation();
  return (
    <Navigate
      to={
        new URLSearchParams(search).has("mesa")
          ? { pathname: "/cardapio", search }
          : "/login"
      }
      replace
    />
  );
}

function ScrollToTop() {
  const { pathname, state } = useLocation();
  useEffect(() => {
    // O card já posiciona o foco e a rolagem no painel de detalhes.
    if (state?.preserveScroll) return;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname, state]);
  return null;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<EntryRoute />} />
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/admin/*" element={<AdminRoutes />} />
        <Route path="/*" element={<ClientRoutes />} />
      </Routes>
    </BrowserRouter>
  );
}
