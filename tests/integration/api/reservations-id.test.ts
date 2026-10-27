import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PATCH, DELETE } from "@/app/api/reservations/[id]/route";

let mockMaybeSingle = vi.fn();
let mockUpdate = vi.fn();
let mockDelete = vi.fn();

vi.mock("@/lib/db-client", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: mockMaybeSingle
        }))
      })),
      update: vi.fn(() => ({
        eq: mockUpdate
      })),
      delete: vi.fn(() => ({
        eq: mockDelete
      }))
    }))
  }))
}));

describe("/api/reservations/[id]", () => {
  beforeEach(() => {
    mockMaybeSingle.mockResolvedValue({ 
      data: { id: "res-1", customer_name: "Test", floor_number: 1, status: "CONFIRMED" }, 
      error: null 
    });
    mockUpdate.mockResolvedValue({ error: null });
    mockDelete.mockResolvedValue({ error: null });
  });

  describe("GET", () => {
    it("returns 200 and data", async () => {
      const req = new Request("http://localhost/api/reservations/res-1");
      const res = await GET(req, { params: Promise.resolve({ id: "res-1" }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.id).toBe("res-1");
    });

    it("returns 404 if not found", async () => {
      mockMaybeSingle.mockResolvedValue({ data: null, error: null });
      const req = new Request("http://localhost/api/reservations/res-1");
      const res = await GET(req, { params: Promise.resolve({ id: "res-1" }) });
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe("Reservasi tidak ditemukan");
    });

    it("returns 500 on db error", async () => {
      mockMaybeSingle.mockResolvedValue({ data: null, error: { message: "DB Error" } });
      const req = new Request("http://localhost/api/reservations/res-1");
      const res = await GET(req, { params: Promise.resolve({ id: "res-1" }) });
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe("DB Error");
    });
  });

  describe("PATCH", () => {
    it("returns 400 for invalid JSON body", async () => {
      const req = new Request("http://localhost/api/reservations/res-1", {
        method: "PATCH",
        body: "not-json",
      });
      const res = await PATCH(req, { params: Promise.resolve({ id: "res-1" }) });
      expect(res.status).toBe(400);
    });

    it("returns 400 for no valid fields", async () => {
      const req = new Request("http://localhost/api/reservations/res-1", {
        method: "PATCH",
        body: JSON.stringify({ invalidField: "test" }),
      });
      const res = await PATCH(req, { params: Promise.resolve({ id: "res-1" }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("No valid fields to update");
    });

    it("returns 400 for invalid status", async () => {
      const req = new Request("http://localhost/api/reservations/res-1", {
        method: "PATCH",
        body: JSON.stringify({ status: "INVALID_STATUS" }),
      });
      const res = await PATCH(req, { params: Promise.resolve({ id: "res-1" }) });
      expect(res.status).toBe(400);
    });

    it("returns 200 on success", async () => {
      const req = new Request("http://localhost/api/reservations/res-1", {
        method: "PATCH",
        body: JSON.stringify({ status: "CHECKED_IN", orderId: "ord-1", depositAmount: 100, depositMethod: "TUNAI" }),
      });
      const res = await PATCH(req, { params: Promise.resolve({ id: "res-1" }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });

    it("returns 409 if overlapping on update", async () => {
      mockUpdate.mockResolvedValue({ error: { message: "Sudah ada reservasi bentrok" } });
      const req = new Request("http://localhost/api/reservations/res-1", {
        method: "PATCH",
        body: JSON.stringify({ status: "CONFIRMED" }),
      });
      const res = await PATCH(req, { params: Promise.resolve({ id: "res-1" }) });
      expect(res.status).toBe(409);
    });

    it("returns 500 on db error during update", async () => {
      mockUpdate.mockResolvedValue({ error: { message: "DB Update Error" } });
      const req = new Request("http://localhost/api/reservations/res-1", {
        method: "PATCH",
        body: JSON.stringify({ status: "CONFIRMED" }),
      });
      const res = await PATCH(req, { params: Promise.resolve({ id: "res-1" }) });
      expect(res.status).toBe(500);
    });
  });

  describe("DELETE", () => {
    it("returns 200 on success", async () => {
      const req = new Request("http://localhost/api/reservations/res-1", { method: "DELETE" });
      const res = await DELETE(req, { params: Promise.resolve({ id: "res-1" }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });

    it("returns 500 on db error", async () => {
      mockDelete.mockResolvedValue({ error: { message: "DB Delete Error" } });
      const req = new Request("http://localhost/api/reservations/res-1", { method: "DELETE" });
      const res = await DELETE(req, { params: Promise.resolve({ id: "res-1" }) });
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe("DB Delete Error");
    });
  });
});
