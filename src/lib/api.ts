import { isDemoMode, handleDemoRequest } from "@/lib/demo-sandbox";

/**
 * Lightweight, unified fetch wrapper for internal API calls.
 * Standardizes JSON parsing, HTTP error throwing, and cache settings.
 * In Demo Mode, routes through client-isolated sandbox.
 */
export async function apiFetch<T>(
  url: string,
  options?: RequestInit,
  defaultErrorMessage = "Permintaan gagal"
): Promise<T> {
  if (typeof window !== "undefined" && isDemoMode() && url.includes("/api/") && !url.includes("/api/auth/login") && !url.includes("/api/auth/logout")) {
    const demoRes = await handleDemoRequest(url, options);
    if (demoRes) {
      const json = await demoRes.json().catch(() => null);
      if (!demoRes.ok) {
        throw new Error(json?.error ?? defaultErrorMessage);
      }
      return (json?.data !== undefined ? json.data : json) as T;
    }
  }

  const isMutation =
    options?.method && options.method !== "GET" && options.method !== "HEAD";
  const headers = new Headers(options?.headers);
  if (
    isMutation &&
    !headers.has("Content-Type") &&
    options?.body &&
    typeof options.body === "string"
  ) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, {
    cache: "no-store",
    ...options,
    headers,
  });

  const json = typeof res.json === "function" ? await res.json().catch(() => null) : null;
  if (!res.ok) {
    throw new Error(json?.error ?? defaultErrorMessage);
  }

  return (json?.data !== undefined ? json.data : json) as T;
}
