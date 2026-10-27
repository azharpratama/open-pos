// Reservation settings — global minimum spend for all reservations.

export type ReservationSettings = {
  amount: number;
};

export async function fetchAppSetting<T>(key: string): Promise<T> {
  const res = await fetch(`/api/app-settings/${encodeURIComponent(key)}`, {
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Gagal memuat pengaturan");
  return json.data as T;
}

export async function updateAppSetting<T>(key: string, value: T): Promise<void> {
  const res = await fetch(`/api/app-settings/${encodeURIComponent(key)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => null);
    throw new Error(json?.error ?? "Gagal menyimpan pengaturan");
  }
}
