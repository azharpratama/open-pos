import { describe, it, expect, vi } from "vitest";
import { fetchCurrentShift, shiftLabel } from "@/lib/current-shift";

describe("current-shift helpers", () => {
  describe("shiftLabel", () => {
    it("returns Siang for SIANG", () => {
      expect(shiftLabel("SIANG")).toBe("Siang");
    });

    it("returns Malam for MALAM", () => {
      expect(shiftLabel("MALAM")).toBe("Malam");
    });

    it("returns Tutup for null", () => {
      expect(shiftLabel(null)).toBe("Tutup");
    });
  });

  describe("fetchCurrentShift", () => {
    it("fetches the current shift from the API", async () => {
      const mockData = {
        date: "2026-07-23",
        shiftType: "SIANG",
        startTime: "09:00",
        endTime: "17:00",
        cashiers: ["Budi", "Andi"],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockData }),
      });

      const result = await fetchCurrentShift();
      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith("/api/current-shift", {
        cache: "no-store",
      });
    });

    it("throws an error if response is not ok", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Shift closed" }),
      });

      await expect(fetchCurrentShift()).rejects.toThrow("Shift closed");
    });

    it("throws a default error if no error message is provided", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({}),
      });

      await expect(fetchCurrentShift()).rejects.toThrow("Gagal memuat shift");
    });
  });
});
