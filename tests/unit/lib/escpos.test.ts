import { describe, it, expect } from "vitest";

/**
 * Tests for src/lib/escpos.ts
 *
 * Validates the ESC/POS binary generator. We can't simulate a thermal printer
 * in Node, but we can verify:
 * 1. The output is a valid Uint8Array.
 * 2. It starts with INIT (0x1b 0x40) and ends with CUT (0x1d 0x56 0x00).
 * 3. It carries the store identity, order info, items, and totals as ASCII —
 *    mirroring the on-screen receipt in components/kasir/receipt-view.tsx.
 */

import { buildEscPosReceipt } from "@/lib/escpos";
import type { Receipt } from "@/lib/receipt";
import { STORE_CONFIG } from "@/config/store";

// Helper to convert Uint8Array to string for simple ASCII substring checks
function bytesToString(bytes: Uint8Array): string {
  return String.fromCharCode.apply(null, Array.from(bytes));
}

const MOCK_RECEIPT: Receipt = {
  orderRef: "POS123456",
  createdAt: "2026-07-23T10:00:00.000Z",
  cashier: "Budi",
  customerName: "Andi",
  orderType: "DINE_IN",
  paymentMethod: "TUNAI",
  amountPaid: 50000,
  change: 15000,
  subtotal: 35000,
  discount: 0,
  total: 35000,
  tableNumber: 5,
  items: [
    { name: "Kopi Hitam", qty: 2, price: 10000, subtotal: 20000 },
    { name: "Roti Bakar", qty: 1, price: 15000, subtotal: 15000 },
  ],
};

describe("buildEscPosReceipt", () => {
  it("returns a non-empty Uint8Array", () => {
    const bytes = buildEscPosReceipt(MOCK_RECEIPT);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(0);
  });

  it("starts with ESC @ (INIT command)", () => {
    const bytes = buildEscPosReceipt(MOCK_RECEIPT);
    expect(bytes[0]).toBe(0x1b); // ESC
    expect(bytes[1]).toBe(0x40); // @
  });

  it("ends with GS V 0 (CUT command)", () => {
    const bytes = buildEscPosReceipt(MOCK_RECEIPT);
    const len = bytes.length;
    expect(bytes[len - 3]).toBe(0x1d); // GS
    expect(bytes[len - 2]).toBe(0x56); // V
    expect(bytes[len - 1]).toBe(0x00); // 0
  });

  it("carries the store identity (name, address, phone)", () => {
    const str = bytesToString(buildEscPosReceipt(MOCK_RECEIPT));
    expect(str).toContain(STORE_CONFIG.name.toUpperCase());
    expect(str).toContain(STORE_CONFIG.address.slice(0, 10)); // address fragment
    expect(str).toContain(STORE_CONFIG.phone);
  });

  it("contains order info incl. cashier and customer (Pemesan)", () => {
    const str = bytesToString(buildEscPosReceipt(MOCK_RECEIPT));
    expect(str).toContain("POS123456"); // orderRef
    expect(str).toContain("Budi"); // cashier
    expect(str).toContain("Andi"); // customerName / Pemesan
  });

  it("renders items as name + `qty x price` line", () => {
    const str = bytesToString(buildEscPosReceipt(MOCK_RECEIPT));
    expect(str).toContain("Kopi Hitam");
    expect(str).toContain("2 x Rp10.000");
    expect(str).toContain("Roti Bakar");
    expect(str).toContain("1 x Rp15.000");
  });

  it("shows floor (Lantai) instead of a raw table number for dine-in", () => {
    const str = bytesToString(buildEscPosReceipt(MOCK_RECEIPT));
    expect(str).toContain("Lantai 5");
  });

  it("shows the total and payment method", () => {
    const str = bytesToString(buildEscPosReceipt(MOCK_RECEIPT));
    expect(str).toContain("TOTAL");
    expect(str).toContain("Tunai");
    expect(str).toContain("Kembalian");
  });

  it("wraps long item names instead of truncating them", () => {
    const longItemReceipt: Receipt = {
      ...MOCK_RECEIPT,
      items: [
        {
          name: "Kopi Susu Gula Aren Spesial Ekstra Shot",
          qty: 1,
          price: 25000,
          subtotal: 25000,
        },
      ],
    };
    const str = bytesToString(buildEscPosReceipt(longItemReceipt));
    // The tail of a long name must survive (no 20-char truncation anymore).
    expect(str).toContain("Spesial");
    expect(str).toContain("Ekstra Shot");
  });

  it("prints an optional order note block", () => {
    const withNote: Receipt = { ...MOCK_RECEIPT, note: "Tanpa gula ya" };
    const str = bytesToString(buildEscPosReceipt(withNote));
    expect(str).toContain("Catatan:");
    expect(str).toContain("Tanpa gula ya");
  });
});
