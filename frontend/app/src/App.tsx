import { useEffect, useState } from "react";
import Categories from "@/pages/admin/categories";
import Orders from "@/pages/admin/order";
import Products from "@/pages/admin/products";

type AdminPage = "products" | "categories" | "orders";

const pageFromPath = (): AdminPage => {
  if (window.location.pathname.endsWith("/categories")) return "categories";
  if (
    window.location.pathname.endsWith("/order") ||
    window.location.pathname.endsWith("/orders")
  ) {
    return "orders";
  }
  return "products";
};

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
        : id === "orders"
          ? { page: "orders" as const, path: "/admin/order" }
        : id === "menu"
          ? { page: "products" as const, path: "/admin/products" }
          : null;

    if (!destination || destination.page === page) return;

    window.history.pushState({}, "", destination.path);
    setPage(destination.page);
  };

  if (page === "categories") return <Categories onNavigate={navigate} />;
  if (page === "orders") return <Orders onNavigate={navigate} />;
  return <Products onNavigate={navigate} />;
}

export default App;
