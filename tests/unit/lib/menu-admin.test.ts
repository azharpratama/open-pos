import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  fetchMenuItems,
  fetchMenuItem,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  uploadMenuPhoto,
} from "@/lib/menu-admin";

vi.mock("browser-image-compression", () => ({
  default: vi.fn().mockResolvedValue(new Blob(["compressed"], { type: "image/png" })),
}));

describe("lib/menu-admin", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  describe("fetchMenuItems", () => {
    it("throws error if fetch fails", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        json: vi.fn().mockResolvedValue({ error: "fail" }),
      } as any);
      await expect(fetchMenuItems()).rejects.toThrow("fail");
    });

    it("returns data on success", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ data: [{ id: "1" }] }),
      } as any);
      const res = await fetchMenuItems();
      expect(res).toEqual([{ id: "1" }]);
    });
  });

  describe("fetchMenuItem", () => {
    it("throws error if fetch fails", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        json: vi.fn().mockResolvedValue({ error: "fail" }),
      } as any);
      await expect(fetchMenuItem("1")).rejects.toThrow("fail");
    });

    it("returns data on success", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ data: { id: "1" } }),
      } as any);
      const res = await fetchMenuItem("1");
      expect(res).toEqual({ id: "1" });
    });
  });

  describe("createMenuItem", () => {
    it("throws error if fetch fails", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        json: vi.fn().mockResolvedValue({ error: "fail" }),
      } as any);
      const input = { name: "A", category: "Kopi", price: 10, imageUrl: null, ingredients: [] };
      await expect(createMenuItem(input)).rejects.toThrow("fail");
    });

    it("returns data on success", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ data: { id: "1" } }),
      } as any);
      const input = { name: "A", category: "Kopi", price: 10, imageUrl: null, ingredients: [] };
      const res = await createMenuItem(input);
      expect(res).toEqual({ id: "1" });
    });
  });

  describe("updateMenuItem", () => {
    it("throws error if fetch fails", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        json: vi.fn().mockResolvedValue({ error: "fail" }),
      } as any);
      const input = { name: "A", category: "Kopi", price: 10, imageUrl: null, ingredients: [] };
      await expect(updateMenuItem("1", input)).rejects.toThrow("fail");
    });

    it("returns data on success", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ data: { id: "1" } }),
      } as any);
      const input = { name: "A", category: "Kopi", price: 10, imageUrl: null, ingredients: [] };
      const res = await updateMenuItem("1", input);
      expect(res).toEqual({ id: "1" });
    });
  });

  describe("deleteMenuItem", () => {
    it("throws error if fetch fails", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        json: vi.fn().mockResolvedValue({ error: "fail" }),
      } as any);
      await expect(deleteMenuItem("1")).rejects.toThrow("fail");
    });

    it("succeeds if fetch passes", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
      } as any);
      await expect(deleteMenuItem("1")).resolves.toBeUndefined();
    });
  });

  describe("uploadMenuPhoto", () => {
    it("throws error if fetch fails", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        json: vi.fn().mockResolvedValue({ error: "fail" }),
      } as any);
      const file = new File([""], "test.png", { type: "image/png" });
      await expect(uploadMenuPhoto(file)).rejects.toThrow("fail");
    });

    it("returns url on success", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ data: { url: "http://url" } }),
      } as any);
      const file = new File([""], "test.png", { type: "image/png" });
      const res = await uploadMenuPhoto(file);
      expect(res).toBe("http://url");
    });
  });
});
