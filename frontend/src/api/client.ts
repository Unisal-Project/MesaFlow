import { getToken, logout } from "@/services/auth.service";

// VITE_API_URL inclui o prefixo /api/v1. O padrão atende ao ambiente local.
export const API_URL = (
  import.meta.env.VITE_API_URL ||
  `${window.location.protocol}//${window.location.hostname}:3333/api/v1`
).replace(/\/+$/, "");

/** Caminhos como /uploads/... são servidos pelo backend, não pelo Vite. */
export function assetUrl(path: string | null | undefined) {
  if (!path || /^(https?:|data:|blob:)/.test(path)) return path ?? null;
  return new URL(path, new URL(API_URL, window.location.origin)).toString();
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (typeof options.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const token = getToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  // Token expirado ou inválido: encerra a sessão e volta para o login.
  // Em /auth/* o 401 significa credencial errada e deve chegar ao formulário.
  if (response.status === 401 && token && !path.startsWith("/auth/")) {
    logout();
    window.location.assign("/login");
  }
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const message = body && typeof body === "object" && "message" in body
      && typeof body.message === "string" ? body.message : "Não foi possível acessar o servidor";
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}
