import { useEffect, useState } from "react";
import Categories from "@/pages/admin/categories";
import Products from "@/pages/admin/products";
import Tables from "@/pages/admin/table";

type AdminPage = "products" | "categories" | "tables";

const pageFromPath = (): AdminPage =>
  window.location.pathname.endsWith("/categories") ? "categories" :
  window.location.pathname.endsWith("/table") || window.location.pathname.endsWith("/tables") ? "tables" :
  "products";

function App() {
  const [page, setPage] = useState<AdminPage>(pageFromPath);

  useEffect(() => {
    const handleHistoryChange = () => setPage(pageFromPath());
    window.addEventListener("popstate", handleHistoryChange);

    return () => window.removeEventListener("popstate", handleHistoryChange);
  }, []);

  const navigate = (id: string) => {
    const destination =
      id === "categories"
        ? { page: "categories" as const, path: "/admin/categories" }
        : id === "tables"
          ? { page: "tables" as const, path: "/admin/table" }
        : id === "menu"
          ? { page: "products" as const, path: "/admin/products" }
          : null;

    if (!destination || destination.page === page) return;

    window.history.pushState({}, "", destination.path);
    setPage(destination.page);
  };

  if (page === "categories") return <Categories onNavigate={navigate} />;
  if (page === "tables") return <Tables onNavigate={navigate} />;
  return <Products onNavigate={navigate} />;
}

export default App;
