import { getToken, logout } from "@/services/auth.service";

import { ApiError } from "./api-error";

import type { ApiErrorResponse } from "./types";

export { ApiError } from "./api-error";

const DEFAULT_API_PORT = "3333";
const API_PREFIX = "/api/v1";
const CONNECTION_ERROR_MESSAGE =
  "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.";

function getDefaultApiUrl(): string {
  if (typeof window === "undefined") {
    return `http://localhost:${DEFAULT_API_PORT}${API_PREFIX}`;
  }

  return `${window.location.protocol}//${window.location.hostname}:${DEFAULT_API_PORT}${API_PREFIX}`;
}

// VITE_API_URL inclui o prefixo /api/v1. O padrão atende ao ambiente local.
export const API_URL = (
  import.meta.env.VITE_API_URL || getDefaultApiUrl()
).replace(/\/+$/, "");

/** Caminhos como /uploads/... são servidos pelo backend, não pelo Vite. */
export function assetUrl(path: string | null | undefined) {
  if (!path || /^(https?:|data:|blob:)/.test(path)) return path ?? null;
  return new URL(path, new URL(API_URL, window.location.origin)).toString();
}

function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${API_URL}${normalizedPath}`;
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204 || response.status === 205) {
    return undefined as T;
  }

  const responseText = await response.text();

  if (!responseText) {
    return undefined as T;
  }

  try {
    return JSON.parse(responseText) as T;
  } catch {
    return responseText as T;
  }
}

function getErrorMessage(data: unknown): string {
  if (isApiErrorResponse(data)) {
    return data.message;
  }

  return "Não foi possível acessar o servidor";
}

function isApiErrorResponse(data: unknown): data is ApiErrorResponse {
  return (
    typeof data === "object" &&
    data !== null &&
    "message" in data &&
    typeof data.message === "string"
  );
}

/**
 * Ponto único de saída para o backend: monta a URL, injeta o token,
 * trata falha de rede e encerra a sessão em 401.
 */
async function sendRequest(
  path: string,
  options: RequestInit,
  headers: Headers,
): Promise<Response> {
  const token = getToken();

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;

  try {
    response = await fetch(buildApiUrl(path), { ...options, headers });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }

    throw new Error(CONNECTION_ERROR_MESSAGE);
  }

  // Token expirado ou inválido: encerra a sessão e volta para o login.
  // Em /auth/* o 401 significa credencial errada e deve chegar ao formulário.
  if (response.status === 401 && token && !path.startsWith("/auth/")) {
    logout();
    window.location.assign("/login");
  }

  return response;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);

  if (typeof options.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await sendRequest(path, options, headers);
  const data = await parseResponse<unknown>(response);

  if (!response.ok) {
    throw new ApiError(getErrorMessage(data), response.status, data);
  }

  return data as T;
}

export async function apiRequestBlob(
  path: string,
  options: RequestInit = {},
): Promise<Blob> {
  const response = await sendRequest(
    path,
    options,
    new Headers(options.headers),
  );

  if (!response.ok) {
    const data = await parseResponse<unknown>(response);

    throw new ApiError(getErrorMessage(data), response.status, data);
  }

  return response.blob();
}
