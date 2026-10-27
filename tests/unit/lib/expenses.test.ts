import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchExpenses, recordExpense } from "@/lib/expenses";

describe("lib/expenses", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("fetchExpenses", () => {
    it("throws error if fetch fails", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        json: vi.fn().mockResolvedValue({ error: "Fetch error" }),
      } as any);

      await expect(fetchExpenses()).rejects.toThrow("Fetch error");
    });

    it("returns data on success", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ data: [{ id: "1" }] }),
      } as any);

      const result = await fetchExpenses();
      expect(result).toEqual([{ id: "1" }]);
    });
  });

  describe("recordExpense", () => {
    it("throws error if fetch fails", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        json: vi.fn().mockResolvedValue({ error: "Record error" }),
      } as any);

      await expect(recordExpense({ note: "Test", total: 100 })).rejects.toThrow("Record error");
    });

    it("returns data on success", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ data: { id: "1" } }),
      } as any);

      const result = await recordExpense({ note: "Test", total: 100 });
      expect(result).toEqual({ id: "1" });
    });
  });
});
