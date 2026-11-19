import { getApiBaseUrl } from "@/api/client";

export function resolveImageUrl(
  imageUrl: string | null,
): string | undefined {
  if (!imageUrl) return undefined;

  if (/^https?:\/\//i.test(imageUrl)) {
    return imageUrl;
  }

  return new URL(imageUrl, getApiBaseUrl().origin).href;
}
