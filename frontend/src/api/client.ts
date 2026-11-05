import { ApiError } from "./api-error";

import type { ApiErrorResponse } from "./types";

export { ApiError } from "./api-error";

const DEFAULT_API_PORT = "3333";
const API_PREFIX = "/api/v1";

function getDefaultApiUrl(): string {
  if (typeof window === "undefined") {
    return `http://localhost:${DEFAULT_API_PORT}${API_PREFIX}`;
  }

  return `${window.location.protocol}//${window.location.hostname}:${DEFAULT_API_PORT}${API_PREFIX}`;
}

export const API_URL = (
  import.meta.env.VITE_API_URL || getDefaultApiUrl()
).replace(/\/+$/, "");

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

function isApiErrorResponse(
  data: unknown,
): data is ApiErrorResponse {
  return (
    typeof data === "object" &&
    data !== null &&
    "message" in data &&
    typeof data.message === "string"
  );
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);

  if (
    typeof options.body === "string" &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  const url = buildApiUrl(path);

  let response: Response;

  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }

    throw new Error(
      "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.",
    );
  }

  const data = await parseResponse<unknown>(response);

  if (!response.ok) {
    throw new ApiError(
      getErrorMessage(data),
      response.status,
      data,
    );
  }

  return data as T;
}

export async function apiRequestBlob(
  path: string,
  options: RequestInit = {},
): Promise<Blob> {
  const url = buildApiUrl(path);

  let response: Response;

  try {
    response = await fetch(url, options);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }

    throw new Error(
      "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.",
    );
  }

  if (!response.ok) {
    const data = await parseResponse<unknown>(response);

    throw new ApiError(
      getErrorMessage(data),
      response.status,
      data,
    );
  }

  return response.blob();
}

