import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchAppSetting, updateAppSetting } from "@/lib/app-settings";

// Mock the global fetch
global.fetch = vi.fn();

describe("App Settings Library", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchAppSetting", () => {
    it("should fetch an app setting successfully", async () => {
      const mockSetting = { amount: 300000 };
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockSetting }),
      });

      const result = await fetchAppSetting<{ amount: number }>("reservation_minimum_spend");

      expect(global.fetch).toHaveBeenCalledWith("/api/app-settings/reservation_minimum_spend", {
        cache: "no-store",
      });
      expect(result).toEqual(mockSetting);
    });

    it("should throw an error if the fetch fails", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Setting not found" }),
      });

      await expect(fetchAppSetting("invalid_key")).rejects.toThrow("Setting not found");
    });

    it("should throw a default error if the fetch fails without a message", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      });

      await expect(fetchAppSetting("invalid_key")).rejects.toThrow("Gagal memuat pengaturan");
    });
  });

  describe("updateAppSetting", () => {
    it("should update an app setting successfully", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
      });

      await updateAppSetting("reservation_minimum_spend", { amount: 500000 });

      expect(global.fetch).toHaveBeenCalledWith("/api/app-settings/reservation_minimum_spend", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: { amount: 500000 } }),
      });
    });

    it("should throw an error if the update fails", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Validation failed" }),
      });

      await expect(updateAppSetting("key", { val: 1 })).rejects.toThrow("Validation failed");
    });

    it("should throw a default error if the update fails without a message", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => { throw new Error("Parse error"); },
      });

      await expect(updateAppSetting("key", { val: 1 })).rejects.toThrow("Gagal menyimpan pengaturan");
    });
  });
});
