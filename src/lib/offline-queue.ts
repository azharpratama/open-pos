/**
 * Offline Order Queue — stores orders locally in IndexedDB (via idb-keyval)
 * when the network is unavailable, and syncs them to the server when the
 * connection is restored.
 *
 * This module is purely client-side (browser-only). It is designed to be
 * imported from the kasir/pesan page.
 */
import { get, set, del } from "idb-keyval";
import { toast } from "sonner";

export interface OfflineOrder {
  /** Temporary client-side ID (timestamp-based). */
  id: string;
  /** The full JSON body that would have been sent to POST /api/orders. */
  payload: {
    orderRef: string;
    cashierName: string;
    customerName: string;
    orderType: "DINE_IN" | "TAKEAWAY";
    tableNumber?: number;
    note?: string;
    paymentMethod: "TUNAI" | "QRIS" | "TRANSFER";
    amountPaid: number;
    changeAmount: number;
    discount: number;
    items: { productId: string; qty: number }[];
  };
  /** Unix timestamp when the order was queued. */
  timestamp: number;
  /**
   * Amount this order will add to revenue once it reaches the server
   * (subtotal - discount). Held here so "Pendapatan Hari Ini" can show the
   * queued sale on top of the server total, then drop it again automatically
   * when the order syncs and the server starts counting it itself.
   */
  total: number;
}

const QUEUE_KEY = "offline_orders_queue";

// Anything that displays the queue (the revenue total, the network badge) gets
// told when it changes instead of polling for it.
const queueListeners = new Set<() => void>();

function notifyQueueChanged(): void {
  queueListeners.forEach((listener) => listener());
}

/** Subscribe to queue changes (add / sync / clear). Returns an unsubscribe fn. */
export function subscribeOfflineQueue(callback: () => void): () => void {
  queueListeners.add(callback);
  return () => queueListeners.delete(callback);
}

/**
 * Sum of the orders still waiting to reach the server. These are real sales the
 * cashier already served, so they belong in the day's revenue even though the
 * database cannot see them yet.
 */
export async function getPendingOfflineTotal(): Promise<number> {
  const queue = await getOfflineQueue();
  return queue.reduce((sum, order) => sum + (Number(order.total) || 0), 0);
}

/** Add an order to the offline queue (IndexedDB). */
export async function addOrderToQueue(order: OfflineOrder): Promise<boolean> {
  try {
    const queue: OfflineOrder[] = (await get(QUEUE_KEY)) || [];
    queue.push(order);
    await set(QUEUE_KEY, queue);
    notifyQueueChanged();
    return true;
  } catch (error) {
    console.error("Failed to add order to offline queue:", error);
    return false;
  }
}

/** Return all orders currently waiting in the queue. */
export async function getOfflineQueue(): Promise<OfflineOrder[]> {
  try {
    return (await get(QUEUE_KEY)) || [];
  } catch {
    return [];
  }
}

/** Clear the entire queue (used after a full sync). */
export async function clearOfflineQueue(): Promise<void> {
  try {
    await del(QUEUE_KEY);
    notifyQueueChanged();
  } catch (error) {
    console.error("Failed to clear offline queue:", error);
  }
}

/**
 * Attempt to flush all queued orders to the server. This runs on a
 * best-effort basis: each order is sent sequentially. If any order fails,
 * it is kept in the queue for the next attempt. Returns the number of
 * orders that were successfully synced.
 */
let syncPromise: Promise<number> | null = null;

/**
 * Attempt to flush all queued orders to the server. This runs on a
 * best-effort basis: each order is sent sequentially. If any order fails,
 * it is kept in the queue for the next attempt. Returns the number of
 * orders that were successfully synced.
 */
export async function syncOfflineQueue(): Promise<number> {
  if (syncPromise) {
    return syncPromise;
  }

  syncPromise = (async () => {
    try {
      const queue = await getOfflineQueue();
      if (queue.length === 0) return 0;

      const failed: OfflineOrder[] = [];
      let synced = 0;

      for (const order of queue) {
        try {
          const res = await fetch("/api/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(order.payload),
          });

          if (res.ok) {
            synced++;
          } else {
            // Server rejected — keep in queue for manual review, but don't
            // retry infinitely for validation errors (4xx).
            const json = await res.json().catch(() => ({}));
            console.warn(`Offline order ${order.id} rejected:`, json);
            if (res.status >= 500) {
              failed.push(order); // server error — retry later
            }
            // 4xx errors are silently dropped (bad data won't fix itself)
          }
        } catch {
          // Network still down — keep all remaining orders
          failed.push(order);
        }
      }

      // Persist only the failed orders back to the queue
      if (failed.length > 0) {
        await set(QUEUE_KEY, failed);
        notifyQueueChanged();
      } else {
        await clearOfflineQueue();
      }

      return synced;
    } finally {
      syncPromise = null;
    }
  })();

  return syncPromise;
}

/**
 * Sets up a listener that syncs the queue whenever the browser comes back
 * online. Call once at app mount (e.g. in a layout or page effect).
 * Returns a cleanup function.
 */
export function setupOnlineSync(): () => void {
  async function handleOnline() {
    const count = await syncOfflineQueue();
    if (count > 0) {
      toast.success(`${count} pesanan offline berhasil disinkronkan`);
    }
  }

  window.addEventListener("online", handleOnline);

  // Also try an immediate sync in case we loaded while already online
  // and there are stale items.
  if (navigator.onLine) {
    void handleOnline();
  }

  return () => window.removeEventListener("online", handleOnline);
}
