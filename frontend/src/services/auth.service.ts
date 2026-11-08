import { apiRequest } from "@/api/client";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | string;
};

type AuthResult = { user: AuthUser; accessToken: string };

const SESSION_KEY = "mesaflow.session";

export function getSession(): AuthResult | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as AuthResult;
    // Só a expiração é lida; quem valida a assinatura é o backend.
    const payload = session.accessToken.split(".")[1];
    const { exp } = JSON.parse(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/")),
    ) as { exp?: number };
    if (exp && exp * 1000 <= Date.now()) {
      logout();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export const getToken = () => getSession()?.accessToken ?? null;

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

function saveSession(result: AuthResult) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(result));
  return result;
}

export const login = (email: string, password: string) =>
  apiRequest<AuthResult>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  }).then(saveSession);

export const register = (name: string, email: string, password: string) =>
  apiRequest<AuthResult>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  }).then(saveSession);
