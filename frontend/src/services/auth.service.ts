import { apiRequest } from "@/api/client";

const TOKEN_KEY = "mesaflow.accessToken";
export function authHeaders(): HeadersInit {
  const token = sessionStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}
export async function signIn(email: string, password: string, name?: string) {
  const result = await apiRequest<{ accessToken: string }>(name === undefined ? "/auth/login" : "/auth/register", {
    method: "POST", body: JSON.stringify(name === undefined ? { email, password } : { name, email, password }),
  });
  sessionStorage.setItem(TOKEN_KEY, result.accessToken);
}
