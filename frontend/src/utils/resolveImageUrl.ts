import { API_URL } from "@/api/client";

const API_ORIGIN = new URL(API_URL).origin;

export function resolveImageUrl(
  imageUrl: string | null,
): string | undefined {
  if (!imageUrl) return undefined;

  if (/^https?:\/\//i.test(imageUrl)) {
    return imageUrl;
  }

  return new URL(imageUrl, API_ORIGIN).href;
}