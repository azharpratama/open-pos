import { describe, it, expect } from "vitest";

/**
 * Tests for the validate() function exported from src/app/api/orders/route.ts
 *
 * This is the most critical validator in the app — it is the last line of
 * defense before an order is committed to the DB. Every field, every
 * edge case, every invalid combination is tested here.
 *
 * Importing from the route file is possible because the route module doesn't
 * execute any side effects at import time (the database client is only
 * created inside the POST handler body).
 */

// Suppress the `server-only` guard for the admin client by mocking the module
// before importing the route. The validate() function itself doesn't touch
// the admin client, but it lives in the same file.
import { vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db-client", () => ({ createAdminClient: vi.fn() }));

import { validate } from "@/app/api/orders/route";

// Helper: a fully-valid baseline body. Tests mutate individual fields from this.
function validBody(overrides: Record<string, unknown> = {}) {
  return {
    orderRef: "POS123456",
    cashierName: "Budi",
    customerName: "Andi",
    orderType: "DINE_IN",
    tableNumber: 2,
    paymentMethod: "TUNAI",
    amountPaid: 50000,
    changeAmount: 0,
    discount: 0,
    items: [{ productId: "prod-uuid-1", qty: 2 }],
    ...overrides,
  };
}

// ---------- Top-level body validation ----------

describe("validate — top-level body", () => {
  it("accepts a valid body without error", () => {
    const result = validate(validBody());
    expect("error" in result).toBe(false);
    expect("body" in result).toBe(true);
  });

  it("rejects null", () => {
    const result = validate(null);
    expect("error" in result).toBe(true);
  });

  it("rejects a string", () => {
    const result = validate("hello");
    expect("error" in result).toBe(true);
  });

  it("rejects a number", () => {
    const result = validate(42);
    expect("error" in result).toBe(true);
  });

  it("rejects an array", () => {
    const result = validate([]);
    expect("error" in result).toBe(true);
  });
});

// ---------- orderRef ----------

describe("validate — orderRef", () => {
  it("rejects missing orderRef", () => {
    const result = validate(validBody({ orderRef: undefined }));
    expect("error" in result).toBe(true);
    expect((result as { error: string }).error).toContain("orderRef");
  });

  it("rejects empty orderRef", () => {
    const result = validate(validBody({ orderRef: "" }));
    expect("error" in result).toBe(true);
  });

  it("rejects whitespace-only orderRef", () => {
    const result = validate(validBody({ orderRef: "   " }));
    expect("error" in result).toBe(true);
  });

  it("rejects non-string orderRef", () => {
    const result = validate(validBody({ orderRef: 123 }));
    expect("error" in result).toBe(true);
  });
});

// ---------- cashierName ----------

describe("validate — cashierName", () => {
  it("rejects missing cashierName", () => {
    const result = validate(validBody({ cashierName: undefined }));
    expect("error" in result).toBe(true);
    expect((result as { error: string }).error).toContain("cashierName");
  });

  it("rejects empty cashierName", () => {
    const result = validate(validBody({ cashierName: "   " }));
    expect("error" in result).toBe(true);
  });
});

// ---------- orderType ----------

describe("validate — orderType", () => {
  it("accepts DINE_IN", () => {
    expect("body" in validate(validBody({ orderType: "DINE_IN" }))).toBe(true);
  });

  it("accepts TAKEAWAY", () => {
    expect("body" in validate(validBody({ orderType: "TAKEAWAY" }))).toBe(true);
  });

  it("rejects an unknown orderType", () => {
    const result = validate(validBody({ orderType: "DRIVE_THRU" }));
    expect("error" in result).toBe(true);
    expect((result as { error: string }).error).toContain("orderType");
  });

  it("rejects missing orderType", () => {
    const result = validate(validBody({ orderType: undefined }));
    expect("error" in result).toBe(true);
  });

  it("is case-sensitive — lowercase dine_in is rejected", () => {
    const result = validate(validBody({ orderType: "dine_in" }));
    expect("error" in result).toBe(true);
  });
});

// ---------- paymentMethod ----------

describe("validate — paymentMethod", () => {
  it("accepts TUNAI", () => {
    expect("body" in validate(validBody({ paymentMethod: "TUNAI" }))).toBe(true);
  });

  it("accepts QRIS", () => {
    expect("body" in validate(validBody({ paymentMethod: "QRIS" }))).toBe(true);
  });

  it("accepts TRANSFER", () => {
    expect("body" in validate(validBody({ paymentMethod: "TRANSFER" }))).toBe(true);
  });

  it("rejects unknown payment method", () => {
    const result = validate(validBody({ paymentMethod: "CRYPTO" }));
    expect("error" in result).toBe(true);
    expect((result as { error: string }).error).toContain("paymentMethod");
  });

  it("rejects missing paymentMethod", () => {
    const result = validate(validBody({ paymentMethod: undefined }));
    expect("error" in result).toBe(true);
  });
});

// ---------- amountPaid ----------

describe("validate — amountPaid", () => {
  it("accepts 0 (exact change)", () => {
    expect("body" in validate(validBody({ amountPaid: 0 }))).toBe(true);
  });

  it("accepts positive amounts", () => {
    expect("body" in validate(validBody({ amountPaid: 100000 }))).toBe(true);
  });

  it("rejects negative amount", () => {
    const result = validate(validBody({ amountPaid: -1 }));
    expect("error" in result).toBe(true);
    expect((result as { error: string }).error).toContain("amountPaid");
  });

  it("rejects string amount", () => {
    const result = validate(validBody({ amountPaid: "50000" }));
    expect("error" in result).toBe(true);
  });

  it("rejects missing amountPaid", () => {
    const result = validate(validBody({ amountPaid: undefined }));
    expect("error" in result).toBe(true);
  });
});

// ---------- discount ----------

describe("validate — discount", () => {
  it("accepts 0", () => {
    expect("body" in validate(validBody({ discount: 0 }))).toBe(true);
  });

  it("accepts positive discount", () => {
    expect("body" in validate(validBody({ discount: 5000 }))).toBe(true);
  });

  it("accepts undefined (optional field)", () => {
    expect("body" in validate(validBody({ discount: undefined }))).toBe(true);
  });

  it("rejects negative discount", () => {
    const result = validate(validBody({ discount: -1 }));
    expect("error" in result).toBe(true);
    expect((result as { error: string }).error).toContain("discount");
  });

  it("rejects string discount", () => {
    const result = validate(validBody({ discount: "5000" }));
    expect("error" in result).toBe(true);
  });
});

// ---------- tableNumber ----------

describe("validate — tableNumber", () => {
  it("accepts a positive integer", () => {
    expect("body" in validate(validBody({ tableNumber: 1 }))).toBe(true);
  });

  it("accepts undefined (optional for TAKEAWAY)", () => {
    expect("body" in validate(validBody({ tableNumber: undefined, orderType: "TAKEAWAY" }))).toBe(true);
  });

  it("rejects 0", () => {
    const result = validate(validBody({ tableNumber: 0 }));
    expect("error" in result).toBe(true);
    expect((result as { error: string }).error).toContain("tableNumber");
  });

  it("rejects negative tableNumber", () => {
    const result = validate(validBody({ tableNumber: -1 }));
    expect("error" in result).toBe(true);
  });
});

// ---------- items ----------

describe("validate — items", () => {
  it("rejects empty items array", () => {
    const result = validate(validBody({ items: [] }));
    expect("error" in result).toBe(true);
    expect((result as { error: string }).error).toContain("items");
  });

  it("rejects missing items", () => {
    const result = validate(validBody({ items: undefined }));
    expect("error" in result).toBe(true);
  });

  it("rejects items that is not an array", () => {
    const result = validate(validBody({ items: "item1" }));
    expect("error" in result).toBe(true);
  });

  it("accepts multiple valid items", () => {
    const result = validate(validBody({
      items: [
        { productId: "uuid-1", qty: 2 },
        { productId: "uuid-2", qty: 1 },
        { productId: "uuid-3", qty: 3 },
      ],
    }));
    expect("body" in result).toBe(true);
  });

  it("rejects an item with zero qty", () => {
    const result = validate(validBody({ items: [{ productId: "uuid-1", qty: 0 }] }));
    expect("error" in result).toBe(true);
  });

  it("rejects an item with negative qty", () => {
    const result = validate(validBody({ items: [{ productId: "uuid-1", qty: -1 }] }));
    expect("error" in result).toBe(true);
  });

  it("rejects an item with missing productId", () => {
    const result = validate(validBody({ items: [{ qty: 1 }] }));
    expect("error" in result).toBe(true);
  });

  it("rejects an item that is null", () => {
    const result = validate(validBody({ items: [null] }));
    expect("error" in result).toBe(true);
  });
});

// ---------- Output body shape ----------

describe("validate — output body shape", () => {
  it("normalises optional fields to defaults", () => {
    const result = validate(validBody({ discount: undefined, changeAmount: undefined }));
    if ("error" in result) throw new Error(result.error);
    expect(result.body.discount).toBe(0);
    expect(result.body.changeAmount).toBe(0);
  });

  it("passes through customerName when provided", () => {
    const result = validate(validBody({ customerName: "Sari" }));
    if ("error" in result) throw new Error(result.error);
    expect(result.body.customerName).toBe("Sari");
  });

  it("passes through note when provided", () => {
    const result = validate(validBody({ note: "Tanpa gula" }));
    if ("error" in result) throw new Error(result.error);
    expect(result.body.note).toBe("Tanpa gula");
  });

  it("passes through tableNumber when provided", () => {
    const result = validate(validBody({ tableNumber: 3 }));
    if ("error" in result) throw new Error(result.error);
    expect(result.body.tableNumber).toBe(3);
  });
});
