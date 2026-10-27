import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchCancellations, createCancellation, reviewCancellation } from "@/lib/cancellations";

// Mock global fetch
global.fetch = vi.fn();

describe("Cancellations Library", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchCancellations", () => {
    it("should fetch cancellations successfully", async () => {
      const mockData = [{ id: "1", orderRef: "ORD-1" }];
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockData }),
      });

      const result = await fetchCancellations();

      expect(global.fetch).toHaveBeenCalledWith("/api/cancellations?", { cache: "no-store" });
      expect(result).toEqual(mockData);
    });

    it("should fetch cancellations with status param", async () => {
      const mockData = [{ id: "1", status: "PENDING" }];
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockData }),
      });

      const result = await fetchCancellations({ status: "PENDING" });

      expect(global.fetch).toHaveBeenCalledWith("/api/cancellations?status=PENDING", { cache: "no-store" });
      expect(result).toEqual(mockData);
    });

    it("should throw an error on failure", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Database error" }),
      });

      await expect(fetchCancellations()).rejects.toThrow("Database error");
    });

    it("should throw default error on failure if no error message is provided", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({}), // no error field
      });

      await expect(fetchCancellations()).rejects.toThrow("Gagal memuat pembatalan");
    });
  });

  describe("createCancellation", () => {
    it("should create cancellation successfully", async () => {
      const mockPayload = { orderId: "ord-1", requestedBy: "Kasir 1" };
      const mockResponse = { id: "req-1", ...mockPayload };
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockResponse }),
      });

      const result = await createCancellation(mockPayload);

      expect(global.fetch).toHaveBeenCalledWith("/api/cancellations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mockPayload),
      });
      expect(result).toEqual(mockResponse);
    });

    it("should throw an error on failure", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Insert error" }),
      });

      await expect(createCancellation({ orderId: "1", requestedBy: "Kasir" })).rejects.toThrow("Insert error");
    });

    it("should throw default error on failure if no error message is provided", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({}), // no error field
      });

      await expect(createCancellation({ orderId: "1", requestedBy: "Kasir" })).rejects.toThrow("Gagal mengajukan pembatalan");
    });
  });

  describe("reviewCancellation", () => {
    it("should review cancellation successfully", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await reviewCancellation("req-1", "approve");

      expect(global.fetch).toHaveBeenCalledWith("/api/cancellations/req-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
    });

    it("should throw an error on failure", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Not authorized" }),
      });

      await expect(reviewCancellation("req-1", "reject")).rejects.toThrow("Not authorized");
    });

    it("should throw default error if json parsing fails", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => { throw new Error("Parse error"); },
      });

      await expect(reviewCancellation("req-1", "reject")).rejects.toThrow("Gagal memproses pembatalan");
    });
  });
});
