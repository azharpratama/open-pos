import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchReservations, createReservation, updateReservation, fetchReservation } from "@/lib/reservations";

// Mock global fetch
global.fetch = vi.fn();

describe("Reservations Library", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchReservations", () => {
    it("should fetch reservations successfully without params", async () => {
      const mockData = [{ id: "1", customerName: "Test" }];
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockData }),
      });

      const result = await fetchReservations();

      expect(global.fetch).toHaveBeenCalledWith("/api/reservations?", { cache: "no-store" });
      expect(result).toEqual(mockData);
    });

    it("should fetch reservations successfully with params", async () => {
      const mockData = [{ id: "1", customerName: "Test" }];
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockData }),
      });

      const result = await fetchReservations({ date: "2023-01-01", floor: 2 });

      expect(global.fetch).toHaveBeenCalledWith("/api/reservations?date=2023-01-01&floor=2", { cache: "no-store" });
      expect(result).toEqual(mockData);
    });

    it("should fetch reservations successfully with start and end date params", async () => {
      const mockData = [{ id: "1", customerName: "Test" }];
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockData }),
      });

      const result = await fetchReservations({ startDate: "2023-01-01", endDate: "2023-01-31" });

      expect(global.fetch).toHaveBeenCalledWith("/api/reservations?startDate=2023-01-01&endDate=2023-01-31", { cache: "no-store" });
      expect(result).toEqual(mockData);
    });

    it("should throw default error on failure if no error message is provided", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({}), // no error field
      });

      await expect(fetchReservations()).rejects.toThrow("Gagal memuat reservasi");
    });
  });

  describe("createReservation", () => {
    it("should create a reservation successfully", async () => {
      const mockPayload = {
        customerName: "John Doe",
        floorNumber: 1,
        reservationDate: "2023-01-01",
        startTime: "12:00",
        endTime: "14:00"
      };
      
      const mockResponse = { id: "1", ...mockPayload };
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockResponse }),
      });

      const result = await createReservation(mockPayload);

      expect(global.fetch).toHaveBeenCalledWith("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mockPayload),
      });
      expect(result).toEqual(mockResponse);
    });

    it("should throw an error on failure", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      });

      await expect(createReservation({} as any)).rejects.toThrow("Gagal membuat reservasi");
    });
  });

  describe("updateReservation", () => {
    it("should update a reservation successfully", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await updateReservation("res-123", { status: "CHECKED_IN" });

      expect(global.fetch).toHaveBeenCalledWith("/api/reservations/res-123", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CHECKED_IN" }),
      });
    });

    it("should throw an error on failure", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Not found" }),
      });

      await expect(updateReservation("res-123", {})).rejects.toThrow("Not found");
    });

    it("should throw default error if json parsing fails on failure", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => { throw new Error("JSON Parse error"); },
      });

      await expect(updateReservation("res-123", {})).rejects.toThrow("Gagal memperbarui reservasi");
    });
  });

  describe("fetchReservation", () => {
    it("should fetch a single reservation successfully", async () => {
      const mockData = { id: "1", customerName: "Test" };
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockData }),
      });

      const result = await fetchReservation("1");

      expect(global.fetch).toHaveBeenCalledWith("/api/reservations/1", { cache: "no-store" });
      expect(result).toEqual(mockData);
    });

    it("should throw an error on failure", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Not found" }),
      });

      await expect(fetchReservation("1")).rejects.toThrow("Not found");
    });

    it("should throw default error on failure if no error message is provided", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({}), // no error field
      });

      await expect(fetchReservation("1")).rejects.toThrow("Gagal memuat reservasi");
    });
  });
});
