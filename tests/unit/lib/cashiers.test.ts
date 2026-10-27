import { describe, it, expect, vi } from "vitest";
import { fetchRoster } from "@/lib/cashiers";

describe("fetchRoster", () => {
  it("fetches the roster successfully", async () => {
    const mockData = { date: "2026-07-23", data: [{ id: "c1", name: "Budi" }] };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    const result = await fetchRoster();
    expect(result).toEqual({ date: "2026-07-23", entries: [{ id: "c1", name: "Budi" }] });
    expect(global.fetch).toHaveBeenCalledWith("/api/cashiers", { cache: "no-store" });
  });

  it("throws an error if response is not ok", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Server error" }),
    });

    await expect(fetchRoster()).rejects.toThrow("Server error");
  });

  it("throws a default error if no error message is provided", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });

    await expect(fetchRoster()).rejects.toThrow("Gagal memuat daftar kasir");
  });
});
