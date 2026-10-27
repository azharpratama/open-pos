import type { ReservationStatus } from "./reservations";
export type OrderStatus = "ANTRIAN" | "SELESAI" | "DIBATALKAN";
export type PaymentMethod = "TUNAI" | "QRIS" | "TRANSFER";
export type PaymentStatus = "PENDING" | "SUCCESS" | "DEPOSIT" | "REFUNDED";
export type OrderType = "DINE_IN" | "TAKEAWAY";

export type OrderItem = {
  id?: string; // order_item UUID (needed for item-level cancellation)
  name: string;
  qty: number;
  price: number;
  subtotal: number;
  modifier?: string;
};

export type Order = {
  id: string; // order reference, e.g. POS123456
  dbId?: string; // orders.id UUID (needed for cancellation)
  createdAt: string; // ISO string
  cashier: string;
  customerName: string;
  orderType: OrderType;
  tableNumber?: number;
  note?: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  isOpenBill: boolean;
  reservationId?: string;
  reservation?: {
    status: ReservationStatus;
    date: string;
    startTime: string;
    endTime: string;
    downPayment: number;
    note?: string;
  };
  cancellationPending?: boolean; // true when a PENDING cancellation request exists
};

export type OrderItemInput = {
  productId: string;
  qty: number;
  modifier?: string;
};

// Fetches all orders (newest first) with their line items from the API. Throws
// on failure so the caller can show an error state + retry.
export async function fetchOrders(): Promise<Order[]> {
  const res = await fetch("/api/orders", { cache: "no-store" });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error ?? "Gagal memuat pesanan");
  }
  return json.data as Order[];
}

// Flips an order between ANTRIAN and SELESAI. Throws on failure so the caller
// can revert its optimistic update.
export async function updateOrderStatus(
  orderRef: string,
  orderStatus: OrderStatus,
): Promise<void> {
  const res = await fetch(`/api/orders/${encodeURIComponent(orderRef)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderStatus }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => null);
    throw new Error(json?.error ?? "Gagal memperbarui status pesanan");
  }
}

// Add items to an existing open bill order.
export async function addItemsToOrder(
  orderRef: string,
  items: OrderItemInput[],
): Promise<{ newSubtotal: number; newTotal: number }> {
  const res = await fetch(
    `/api/orders/${encodeURIComponent(orderRef)}/items`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    },
  );
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error ?? "Gagal menambah item");
  }
  return json.data;
}

// Close an open bill by taking final payment.
export type ClosePayment = {
  paymentMethod: PaymentMethod;
  amountPaid: number;
  changeAmount: number;
  discount?: number;
};

export async function closeOpenBill(
  orderRef: string,
  payment: ClosePayment,
): Promise<void> {
  const res = await fetch(
    `/api/orders/${encodeURIComponent(orderRef)}/close`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payment),
    },
  );
  if (!res.ok) {
    const json = await res.json().catch(() => null);
    throw new Error(json?.error ?? "Gagal menutup tagihan");
  }
}

