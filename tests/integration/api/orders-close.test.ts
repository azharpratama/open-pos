import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/orders/[ref]/close/route";

let mockMaybeSingle = vi.fn();
let mockUpdate = vi.fn();

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
      }))
    }))
  }))
}));

describe("/api/orders/[ref]/close", () => {
  beforeEach(() => {
    mockMaybeSingle.mockResolvedValue({ 
      data: { id: "1", is_open_bill: true, payment_status: "PENDING", subtotal: 10000, discount: 0 }, 
      error: null 
    });
    mockUpdate.mockResolvedValue({ error: null });
  });

  describe("POST", () => {
    it("returns 400 for invalid JSON body", async () => {
      const req = new Request("http://localhost/api/orders/REF-1/close", {
        method: "POST",
        body: "not-json",
      });
      const res = await POST(req, { params: Promise.resolve({ ref: "REF-1" }) });
      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid paymentMethod", async () => {
      const req = new Request("http://localhost/api/orders/REF-1/close", {
        method: "POST",
        body: JSON.stringify({ paymentMethod: "INVALID", amountPaid: 10000 }),
      });
      const res = await POST(req, { params: Promise.resolve({ ref: "REF-1" }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("paymentMethod must be TUNAI, QRIS, or TRANSFER");
    });

    it("returns 400 for invalid amountPaid", async () => {
      const req = new Request("http://localhost/api/orders/REF-1/close", {
        method: "POST",
        body: JSON.stringify({ paymentMethod: "TUNAI", amountPaid: -10 }),
      });
      const res = await POST(req, { params: Promise.resolve({ ref: "REF-1" }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("amountPaid must be a non-negative number");
    });

    it("returns 404 if order not found", async () => {
      mockMaybeSingle.mockResolvedValue({ data: null, error: null });
      const req = new Request("http://localhost/api/orders/REF-1/close", {
        method: "POST",
        body: JSON.stringify({ paymentMethod: "TUNAI", amountPaid: 10000 }),
      });
      const res = await POST(req, { params: Promise.resolve({ ref: "REF-1" }) });
      expect(res.status).toBe(404);
    });

    it("returns 400 if order is neither open bill nor reservation", async () => {
      mockMaybeSingle.mockResolvedValue({ 
        data: { id: "1", is_open_bill: false, reservation_id: null, payment_status: "PENDING" }, 
        error: null 
      });
      const req = new Request("http://localhost/api/orders/REF-1/close", {
        method: "POST",
        body: JSON.stringify({ paymentMethod: "TUNAI", amountPaid: 10000 }),
      });
      const res = await POST(req, { params: Promise.resolve({ ref: "REF-1" }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Pesanan ini bukan open bill atau reservasi");
    });

    it("returns 400 if order is already paid", async () => {
      mockMaybeSingle.mockResolvedValue({ 
        data: { id: "1", is_open_bill: true, payment_status: "SUCCESS" }, 
        error: null 
      });
      const req = new Request("http://localhost/api/orders/REF-1/close", {
        method: "POST",
        body: JSON.stringify({ paymentMethod: "TUNAI", amountPaid: 10000 }),
      });
      const res = await POST(req, { params: Promise.resolve({ ref: "REF-1" }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Pesanan sudah lunas");
    });

    it("returns 500 on db update error", async () => {
      mockUpdate.mockResolvedValue({ error: { message: "Update Error" } });
      const req = new Request("http://localhost/api/orders/REF-1/close", {
        method: "POST",
        body: JSON.stringify({ paymentMethod: "TUNAI", amountPaid: 10000 }),
      });
      const res = await POST(req, { params: Promise.resolve({ ref: "REF-1" }) });
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe("Update Error");
    });

    it("returns 200 on success", async () => {
      const req = new Request("http://localhost/api/orders/REF-1/close", {
        method: "POST",
        body: JSON.stringify({ paymentMethod: "TUNAI", amountPaid: 10000 }),
      });
      const res = await POST(req, { params: Promise.resolve({ ref: "REF-1" }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });
  });
});
