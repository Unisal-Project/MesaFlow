// VITE_API_URL inclui o prefixo /api/v1. O padrão atende ao ambiente local.
export const API_URL = (
  import.meta.env.VITE_API_URL ||
  `${window.location.protocol}//${window.location.hostname}:3333/api/v1`
).replace(/\/+$/, "");

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (typeof options.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const message = body && typeof body === "object" && "message" in body
      && typeof body.message === "string" ? body.message : "Não foi possível acessar o servidor";
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}
