export type ReservationStatus =
  | "CONFIRMED"
  | "CHECKED_IN"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export type Reservation = {
  id: string;
  customerName: string;
  customerPhone?: string;
  floorNumber: number;
  reservationDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  minimumSpend: number;
  depositAmount: number;
  depositMethod?: string;
  status: ReservationStatus;
  notes?: string;
  orderId?: string;
  createdAt: string;
};

export type CreateReservationBody = {
  customerName: string;
  customerPhone?: string;
  floorNumber: number;
  reservationDate: string;
  startTime: string;
  endTime: string;
  notes?: string;
  // Pre-order + deposit are handled separately after creation
};

export async function fetchReservations(params?: {
  date?: string;
  startDate?: string;
  endDate?: string;
  floor?: number;
}): Promise<Reservation[]> {
  const query = new URLSearchParams();
  if (params?.date) query.set("date", params.date);
  if (params?.startDate) query.set("startDate", params.startDate);
  if (params?.endDate) query.set("endDate", params.endDate);
  if (params?.floor) query.set("floor", String(params.floor));

  const res = await fetch(`/api/reservations?${query}`, { cache: "no-store" });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Gagal memuat reservasi");
  return json.data as Reservation[];
}

export async function createReservation(
  body: CreateReservationBody,
): Promise<Reservation> {
  const res = await fetch("/api/reservations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Gagal membuat reservasi");
  return json.data as Reservation;
}

export async function updateReservation(
  id: string,
  update: Partial<{
    status: ReservationStatus;
    orderId: string;
    depositAmount: number;
    depositMethod: string;
  }>,
): Promise<void> {
  const res = await fetch(`/api/reservations/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(update),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => null);
    throw new Error(json?.error ?? "Gagal memperbarui reservasi");
  }
}

export async function fetchReservation(id: string): Promise<Reservation> {
  const res = await fetch(`/api/reservations/${encodeURIComponent(id)}`, {
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Gagal memuat reservasi");
  return json.data as Reservation;
}
