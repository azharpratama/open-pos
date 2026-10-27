import { describe, it, expect } from "vitest";

/**
 * Tests for src/lib/bookkeeping.ts
 * All of these are pure math functions — no IO, no DB, no mocking needed.
 */

import {
  grossProfit,
  netProfit,
  operatingExpense,
  totalExpense,
  netMargin,
  presetRange,
  type IncomeStatement,
} from "@/lib/bookkeeping";

// Helper to build an IncomeStatement with sensible defaults
function stmt(overrides: Partial<IncomeStatement> = {}): IncomeStatement {
  return {
    revenueGross: 1_000_000,
    discountTotal: 0,
    revenueNet: 1_000_000,
    revenueTunai: 700_000,
    revenueQris: 200_000,
    revenueTransfer: 100_000,
    txCount: 20,
    cogs: 400_000,
    salary: 150_000,
    otherExpense: 50_000,
    ...overrides,
  };
}

// ---------- grossProfit ----------

describe("grossProfit", () => {
  it("is revenueNet - cogs", () => {
    const s = stmt({ revenueNet: 1_000_000, cogs: 400_000 });
    expect(grossProfit(s)).toBe(600_000);
  });

  it("is negative when cogs exceed revenue (loss)", () => {
    const s = stmt({ revenueNet: 100_000, cogs: 200_000 });
    expect(grossProfit(s)).toBe(-100_000);
  });

  it("is zero when cogs equal revenue", () => {
    const s = stmt({ revenueNet: 500_000, cogs: 500_000 });
    expect(grossProfit(s)).toBe(0);
  });
});

// ---------- operatingExpense ----------

describe("operatingExpense", () => {
  it("is salary + otherExpense", () => {
    const s = stmt({ salary: 150_000, otherExpense: 50_000 });
    expect(operatingExpense(s)).toBe(200_000);
  });

  it("is zero when both are zero", () => {
    const s = stmt({ salary: 0, otherExpense: 0 });
    expect(operatingExpense(s)).toBe(0);
  });
});

// ---------- netProfit ----------

describe("netProfit", () => {
  it("is grossProfit - operatingExpense", () => {
    // grossProfit = 1_000_000 - 400_000 = 600_000
    // operatingExpense = 150_000 + 50_000 = 200_000
    // netProfit = 600_000 - 200_000 = 400_000
    const s = stmt();
    expect(netProfit(s)).toBe(400_000);
  });

  it("handles breakeven (zero profit)", () => {
    const s = stmt({ revenueNet: 600_000, cogs: 400_000, salary: 150_000, otherExpense: 50_000 });
    expect(netProfit(s)).toBe(0);
  });

  it("handles net loss scenario", () => {
    const s = stmt({ revenueNet: 300_000, cogs: 400_000, salary: 150_000, otherExpense: 50_000 });
    // grossProfit = -100_000, opEx = 200_000 → net = -300_000
    expect(netProfit(s)).toBe(-300_000);
  });
});

// ---------- totalExpense ----------

describe("totalExpense", () => {
  it("is cogs + salary + otherExpense", () => {
    const s = stmt({ cogs: 400_000, salary: 150_000, otherExpense: 50_000 });
    expect(totalExpense(s)).toBe(600_000);
  });

  it("is zero when everything is zero", () => {
    const s = stmt({ cogs: 0, salary: 0, otherExpense: 0 });
    expect(totalExpense(s)).toBe(0);
  });
});

// ---------- netMargin ----------

describe("netMargin", () => {
  it("is netProfit / revenueNet", () => {
    // netProfit = 400_000, revenueNet = 1_000_000 → 0.4
    const s = stmt();
    expect(netMargin(s)).toBeCloseTo(0.4);
  });

  it("is 0 when revenueNet is 0 (no division by zero)", () => {
    const s = stmt({ revenueNet: 0 });
    expect(netMargin(s)).toBe(0);
  });

  it("is negative for a loss-making period", () => {
    const s = stmt({ revenueNet: 100_000, cogs: 200_000, salary: 0, otherExpense: 0 });
    expect(netMargin(s)).toBeCloseTo(-1.0);
  });

  it("is 1 (100%) when there are no expenses", () => {
    const s = stmt({ revenueNet: 500_000, cogs: 0, salary: 0, otherExpense: 0 });
    expect(netMargin(s)).toBe(1);
  });
});

// ---------- presetRange ----------

describe("presetRange", () => {
  // These are time-dependent but we can check structural invariants without mocking:
  // the returned start and end must be valid YYYY-MM-DD strings, and start <= end.

  it("today: start === end", () => {
    const { start, end } = presetRange("today");
    expect(start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(start).toBe(end);
  });

  it("week: start is on or before end", () => {
    const { start, end } = presetRange("week");
    expect(start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(end).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(start <= end).toBe(true);
  });

  it("month: start is on the 1st of the month", () => {
    const { start, end } = presetRange("month");
    expect(start.endsWith("-01")).toBe(true);
    expect(start <= end).toBe(true);
  });

  it("week start is always a Monday (day 1 in ISO week)", () => {
    const { start } = presetRange("week");
    // A Monday parsed as UTC midnight should have getUTCDay() === 1
    const d = new Date(`${start}T00:00:00Z`);
    expect(d.getUTCDay()).toBe(1);
  });
});

// ---------- fetchBookkeeping ----------
import { vi } from "vitest";
import { fetchBookkeeping } from "@/lib/bookkeeping";

describe("fetchBookkeeping", () => {
  it("fetches from the correct URL with start and end params", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { income: stmt(), cashbook: [] } }),
    });

    await fetchBookkeeping("2026-07-01", "2026-07-31");

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/bookkeeping?start=2026-07-01&end=2026-07-31",
      { cache: "no-store" }
    );
  });

  it("throws an error if the response is not ok", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Data not found" }),
    });

    await expect(fetchBookkeeping("2026-07-01", "2026-07-31"))
      .rejects.toThrow("Data not found");
  });

  it("throws a default error if the response is not ok and no error is provided", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });

    await expect(fetchBookkeeping("2026-07-01", "2026-07-31"))
      .rejects.toThrow("Gagal memuat pembukuan");
  });
});

