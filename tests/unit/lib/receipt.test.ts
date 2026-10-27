import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Tests for src/lib/receipt.ts
 * Pure functions: generateOrderRef, parseReceipt (via save/get pattern),
 * and the MOCK_RECEIPT shape contract.
 */

import { generateOrderRef, MOCK_RECEIPT } from "@/lib/receipt";

// ---------- generateOrderRef ----------

describe("generateOrderRef", () => {
  it("starts with POS", () => {
    expect(generateOrderRef().startsWith("POS")).toBe(true);
  });

  it("is followed by exactly 6 digits", () => {
    const ref = generateOrderRef();
    expect(ref).toMatch(/^POS\d{6}$/);
  });

  it("the numeric part is between 100000 and 999999 (inclusive)", () => {
    for (let i = 0; i < 100; i++) {
      const num = Number(generateOrderRef().slice(3));
      expect(num).toBeGreaterThanOrEqual(100000);
      expect(num).toBeLessThanOrEqual(999999);
    }
  });

  it("produces unique values across many calls", () => {
    const refs = new Set(Array.from({ length: 1000 }, generateOrderRef));
    // With 900_000 possible values, the chance of any collision in 1000 draws is tiny
    // We just assert we got at least 990 unique values (allows for rare duplicates)
    expect(refs.size).toBeGreaterThanOrEqual(990);
  });
});

// ---------- MOCK_RECEIPT shape contract ----------

describe("MOCK_RECEIPT", () => {
  it("has a valid orderRef format", () => {
    expect(MOCK_RECEIPT.orderRef).toMatch(/^POS\d{6}$/);
  });

  it("subtotal equals sum of item subtotals", () => {
    const sum = MOCK_RECEIPT.items.reduce((acc, item) => acc + item.subtotal, 0);
    expect(MOCK_RECEIPT.subtotal).toBe(sum);
  });

  it("total equals subtotal minus discount", () => {
    expect(MOCK_RECEIPT.total).toBe(MOCK_RECEIPT.subtotal - MOCK_RECEIPT.discount);
  });

  it("change equals amountPaid minus total", () => {
    expect(MOCK_RECEIPT.change).toBe(MOCK_RECEIPT.amountPaid - MOCK_RECEIPT.total);
  });

  it("each item subtotal equals qty * price", () => {
    for (const item of MOCK_RECEIPT.items) {
      expect(item.subtotal).toBe(item.qty * item.price);
    }
  });

  it("has a valid paymentMethod", () => {
    expect(["TUNAI", "QRIS", "TRANSFER"]).toContain(MOCK_RECEIPT.paymentMethod);
  });

  it("has a valid orderType", () => {
    expect(["DINE_IN", "TAKEAWAY"]).toContain(MOCK_RECEIPT.orderType);
  });
});

// ---------- parseReceipt & getReceiptSnapshot fallbacks ----------
import { getReceiptSnapshot, saveReceipt } from "@/lib/receipt";

describe("Receipt Fallbacks", () => {
  beforeEach(() => {
    const store = new Map();
    vi.stubGlobal("window", {
      sessionStorage: {
        getItem: vi.fn((key) => store.get(key) || null),
        setItem: vi.fn((key, value) => store.set(key, value)),
        removeItem: vi.fn((key) => store.delete(key)),
        clear: vi.fn(() => store.clear()),
      }
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("getReceiptSnapshot returns null if sessionStorage is empty", () => {
    window.sessionStorage.removeItem("openpos:last-receipt");
    const snap = getReceiptSnapshot();
    expect(snap).toBeNull();
  });

  it("getReceiptSnapshot handles invalid JSON in sessionStorage", () => {
    window.sessionStorage.setItem("openpos:last-receipt", "invalid-json");
    const snap = getReceiptSnapshot();
    expect(snap).toBeNull();
  });

  it("saveReceipt and getReceiptSnapshot work together", () => {
    saveReceipt(MOCK_RECEIPT);
    const snap = getReceiptSnapshot();
    expect(snap).toEqual(MOCK_RECEIPT);
  });
});
