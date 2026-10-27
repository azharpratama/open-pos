import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchBonuses, setBonus, removeBonus, consumeBonus } from "@/lib/bonuses";

describe("lib/bonuses", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  describe("fetchBonuses", () => {
    it("throws error if fetch fails", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        json: vi.fn().mockResolvedValue({ error: "fail" }),
      } as any);
      await expect(fetchBonuses()).rejects.toThrow("fail");
    });

    it("returns data on success", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ data: [{ id: "1" }] }),
      } as any);
      const res = await fetchBonuses();
      expect(res).toEqual([{ id: "1" }]);
    });
  });

  describe("setBonus", () => {
    it("throws error if fetch fails", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        json: vi.fn().mockResolvedValue({ error: "fail" }),
      } as any);
      await expect(setBonus("emp", "prod", 10)).rejects.toThrow("fail");
    });

    it("succeeds if fetch passes", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
      } as any);
      await expect(setBonus("emp", "prod", 10)).resolves.toBeUndefined();
    });
  });

  describe("removeBonus", () => {
    it("throws error if fetch fails", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        json: vi.fn().mockResolvedValue({ error: "fail" }),
      } as any);
      await expect(removeBonus("1")).rejects.toThrow("fail");
    });

    it("succeeds if fetch passes", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
      } as any);
      await expect(removeBonus("1")).resolves.toBeUndefined();
    });
  });

  describe("consumeBonus", () => {
    it("throws error if fetch fails", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        json: vi.fn().mockResolvedValue({ error: "fail" }),
      } as any);
      await expect(consumeBonus("1", 2)).rejects.toThrow("fail");
    });

    it("returns data on success", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ data: { remaining: 8, stock: 98 } }),
      } as any);
      const res = await consumeBonus("1", 2);
      expect(res).toEqual({ remaining: 8, stock: 98 });
    });
  });
});
