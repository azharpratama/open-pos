import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests for src/lib/offline-queue.ts
 *
 * The module uses idb-keyval (IndexedDB) — we mock it to avoid requiring
 * a real browser environment, and mock fetch to control server responses.
 * This lets us test all the sync business logic in Node.
 */

// Mock idb-keyval before importing the module
const store = new Map<string, unknown>();
vi.mock("idb-keyval", () => ({
  get: vi.fn(async (key: string) => store.get(key)),
  set: vi.fn(async (key: string, value: unknown) => { store.set(key, value); }),
  del: vi.fn(async (key: string) => { store.delete(key); }),
}));

// Mock sonner so toast calls don't throw
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import {
  addOrderToQueue,
  getOfflineQueue,
  clearOfflineQueue,
  syncOfflineQueue,
  type OfflineOrder,
} from "@/lib/offline-queue";

import { get, set, del } from "idb-keyval";

function makeOrder(id: string, overrides: Partial<OfflineOrder["payload"]> = {}): OfflineOrder {
  return {
    id,
    timestamp: Date.now(),
    total: 30000,
    payload: {
      orderRef: `POS${id}`,
      cashierName: "Budi",
      customerName: "Andi",
      orderType: "DINE_IN",
      paymentMethod: "TUNAI",
      amountPaid: 30000,
      changeAmount: 0,
      discount: 0,
      items: [{ productId: "prod-1", qty: 1 }],
      ...overrides,
    },
  };
}

beforeEach(() => {
  store.clear();
  vi.clearAllMocks();
});

// ---------- addOrderToQueue ----------

describe("addOrderToQueue", () => {
  it("adds the first order to an empty queue", async () => {
    const order = makeOrder("001");
    const result = await addOrderToQueue(order);
    expect(result).toBe(true);
    const queue = await getOfflineQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].id).toBe("001");
  });

  it("appends to an existing queue", async () => {
    await addOrderToQueue(makeOrder("001"));
    await addOrderToQueue(makeOrder("002"));
    const queue = await getOfflineQueue();
    expect(queue).toHaveLength(2);
  });

  it("returns false when IndexedDB throws", async () => {
    (get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("QuotaExceeded"));
    const result = await addOrderToQueue(makeOrder("001"));
    expect(result).toBe(false);
  });
});

// ---------- getOfflineQueue ----------

describe("getOfflineQueue", () => {
  it("returns an empty array when the queue is absent", async () => {
    const queue = await getOfflineQueue();
    expect(queue).toEqual([]);
  });

  it("returns [] when IndexedDB throws", async () => {
    (get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("fail"));
    const queue = await getOfflineQueue();
    expect(queue).toEqual([]);
  });
});

// ---------- clearOfflineQueue ----------

describe("clearOfflineQueue", () => {
  it("removes the queue from the store", async () => {
    await addOrderToQueue(makeOrder("001"));
    await clearOfflineQueue();
    const queue = await getOfflineQueue();
    expect(queue).toEqual([]);
    expect(del).toHaveBeenCalled();
  });
});

// ---------- syncOfflineQueue ----------

describe("syncOfflineQueue", () => {
  it("returns 0 immediately when the queue is empty", async () => {
    global.fetch = vi.fn();
    const count = await syncOfflineQueue();
    expect(count).toBe(0);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("syncs orders successfully (200 OK) and clears the queue", async () => {
    await addOrderToQueue(makeOrder("001"));
    await addOrderToQueue(makeOrder("002"));

    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });

    const count = await syncOfflineQueue();
    expect(count).toBe(2);
    const remaining = await getOfflineQueue();
    expect(remaining).toHaveLength(0);
    expect(del).toHaveBeenCalled(); // clearOfflineQueue was called
  });

  it("drops 4xx rejected orders (bad data won't fix itself on retry)", async () => {
    await addOrderToQueue(makeOrder("001"));

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: "invalid" }),
    });

    const count = await syncOfflineQueue();
    expect(count).toBe(0);

    // 4xx → dropped, queue is cleared
    const remaining = await getOfflineQueue();
    expect(remaining).toHaveLength(0);
  });

  it("keeps 5xx rejected orders for retry", async () => {
    await addOrderToQueue(makeOrder("001"));

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: "server error" }),
    });

    const count = await syncOfflineQueue();
    expect(count).toBe(0);

    // 5xx → kept in queue
    const remaining = await getOfflineQueue();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe("001");
  });

  it("keeps orders when a network error occurs (fetch throws)", async () => {
    await addOrderToQueue(makeOrder("001"));
    await addOrderToQueue(makeOrder("002"));

    global.fetch = vi.fn().mockRejectedValue(new TypeError("Network request failed"));

    const count = await syncOfflineQueue();
    expect(count).toBe(0);

    const remaining = await getOfflineQueue();
    expect(remaining).toHaveLength(2);
  });

  it("partially syncs: succeeds for some, keeps 5xx failures for retry", async () => {
    await addOrderToQueue(makeOrder("001"));
    await addOrderToQueue(makeOrder("002"));
    await addOrderToQueue(makeOrder("003"));

    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount === 2) {
        return { ok: false, status: 503, json: async () => ({}) }; // second order fails
      }
      return { ok: true, status: 200 };
    });

    const count = await syncOfflineQueue();
    expect(count).toBe(2); // orders 001 and 003 succeeded

    const remaining = await getOfflineQueue();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe("002");
  });

  it("sends the correct payload to /api/orders for each order", async () => {
    const order = makeOrder("001");
    await addOrderToQueue(order);

    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });

    await syncOfflineQueue();

    expect(fetch).toHaveBeenCalledWith("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(order.payload),
    });
  });
});
