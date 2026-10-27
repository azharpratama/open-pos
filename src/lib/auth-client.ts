import { createAuthClient } from "better-auth/react";
import useSWR from "swr";

export const authClient = createAuthClient({
  baseURL:
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"),
});

export const { signIn, signOut, useSession, getSession } = authClient;

/**
 * Reactive SWR hook for Better Auth session.
 * Automatically synchronizes with SWR cache, window focus, and revalidation.
 */
export function useUserSession() {
  return useSWR("better-auth-session", async () => {
    const res = await authClient.getSession();
    return res.data;
  });
}
