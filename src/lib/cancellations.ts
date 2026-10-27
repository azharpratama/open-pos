export type CancellationStatus = "PENDING" | "APPROVED" | "REJECTED";

export type CancellationRequest = {
  id: string;
  orderId: string;
  orderRef: string;
  customerName: string;
  orderTotal: number;
  itemIds?: string[]; // null = whole order
  itemNames?: string[]; // display names for item-level cancellations
  requestedBy: string;
  reason?: string;
  status: CancellationStatus;
  reviewedAt?: string;
  createdAt: string;
};

export async function fetchCancellations(params?: {
  status?: CancellationStatus;
}): Promise<CancellationRequest[]> {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);

  const res = await fetch(`/api/cancellations?${query}`, { cache: "no-store" });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Gagal memuat pembatalan");
  return json.data as CancellationRequest[];
}

export async function createCancellation(body: {
  orderId: string;
  itemIds?: string[];
  requestedBy: string;
  reason?: string;
}): Promise<CancellationRequest> {
  const res = await fetch("/api/cancellations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Gagal mengajukan pembatalan");
  return json.data as CancellationRequest;
}

export async function reviewCancellation(
  id: string,
  action: "approve" | "reject",
): Promise<void> {
  const res = await fetch(`/api/cancellations/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => null);
    throw new Error(json?.error ?? "Gagal memproses pembatalan");
  }
}
