export type PaymentMethod = "TUNAI" | "QRIS" | "TRANSFER";
export type OrderType = "DINE_IN" | "TAKEAWAY";

export type ReceiptItem = {
  name: string;
  qty: number;
  price: number;
  subtotal: number;
};

export type Receipt = {
  orderRef: string;
  createdAt: string; // ISO string
  cashier: string;
  customerName: string;
  items: ReceiptItem[];
  subtotal: number; // sum of line items, before discount
  discount: number; // Rp taken off the bill (0 when none)
  total: number; // subtotal - discount, what the customer pays
  orderType: OrderType;
  tableNumber?: number;
  note?: string;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  change: number;
};

const STORAGE_KEY = "openpos:last-receipt";

export function generateOrderRef(prefix = "POS"): string {
  return `${prefix}${Math.floor(100000 + Math.random() * 900000)}`;
}

function parseReceipt(raw: string): Receipt | null {
  try {
    return JSON.parse(raw) as Receipt;
  } catch {
    return null;
  }
}

export function saveReceipt(receipt: Receipt): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(receipt));
}

// --- useSyncExternalStore adapters ---
// Reading sessionStorage is client-only; these keep it SSR-safe and cache the
// parsed value so getSnapshot returns a stable reference between renders.
let snapshotRaw: string | null = null;
let snapshotValue: Receipt | null = null;

export function subscribeReceipt(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

export function getReceiptSnapshot(): Receipt | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (raw === snapshotRaw) return snapshotValue;
  snapshotRaw = raw;
  snapshotValue = raw ? parseReceipt(raw) : null;
  return snapshotValue;
}

export function getReceiptServerSnapshot(): Receipt | null {
  return null;
}

// Fallback so the struk page is directly viewable during frontend/stub work,
// even without coming through the payment flow.
export const MOCK_RECEIPT: Receipt = {
  orderRef: "POS482913",
  createdAt: "2026-07-14T09:24:00.000Z",
  cashier: "Karyawan",
  customerName: "Budi",
  items: [
    { name: "Kopi Susu Aren", qty: 2, price: 20000, subtotal: 40000 },
    { name: "Roti Bakar Coklat Keju", qty: 1, price: 18000, subtotal: 18000 },
    { name: "Es Teh Manis", qty: 2, price: 8000, subtotal: 16000 },
  ],
  subtotal: 74000,
  discount: 0,
  total: 74000,
  orderType: "DINE_IN",
  tableNumber: 2,
  paymentMethod: "TUNAI",
  amountPaid: 100000,
  change: 26000,
};
