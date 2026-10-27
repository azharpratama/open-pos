export type Role = "KASIR" | "OWNER";

const STORAGE_KEY = "openpos:role";

// Client-side session state for the currently selected role (KASIR or OWNER).

export function setRole(role: Role): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(STORAGE_KEY, role);
}

export function getRole(): Role | null {
  if (typeof window === "undefined") return null;
  const value = window.sessionStorage.getItem(STORAGE_KEY);
  return value === "KASIR" || value === "OWNER" ? value : null;
}

export function clearRole(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(STORAGE_KEY);
}

const SHIFT_KEY = "openpos:shift-open";
const shiftListeners = new Set<() => void>();

// Shift gate for the cashier: ordering is only allowed while a shift is open.
// Persisted (per tab) so it survives navigating between Kasir/Pesanan. Exposed
// via useSyncExternalStore so the initial read is SSR-safe (server snapshot is
// always false; the client value applies after hydration with no mismatch).
//
// Note this is only a UI gate. Revenue is NOT tracked here — it is read from
// the server (see fetchTodayRevenue in lib/shifts), because a per-tab counter
// showed Rp 0 on every other tab, device, and re-login.
export function setShiftOpen(open: boolean): void {
  if (typeof window === "undefined") return;
  if (open) {
    window.sessionStorage.setItem(SHIFT_KEY, "1");
  } else {
    window.sessionStorage.removeItem(SHIFT_KEY);
  }
  shiftListeners.forEach((listener) => listener());
}

export function subscribeShiftOpen(callback: () => void): () => void {
  shiftListeners.add(callback);
  return () => shiftListeners.delete(callback);
}

export function getShiftOpenSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(SHIFT_KEY) === "1";
}

export function getShiftOpenServerSnapshot(): boolean {
  return false;
}
