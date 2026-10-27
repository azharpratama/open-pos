import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/cancellations/route";

let mockMaybeSingle = vi.fn();
let mockInsertSingle = vi.fn();
let mockGetResult = vi.fn();

vi.mock("@/lib/db-client", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          eq: vi.fn(() => mockGetResult()),
          then: (res: any) => res(mockGetResult())
        })),
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: mockMaybeSingle
          }))
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: mockInsertSingle
        }))
      }))
    }))
  }))
}));

describe("/api/cancellations", () => {
  beforeEach(() => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockGetResult.mockResolvedValue({ 
      data: [{ id: "req-1", orders: null }, { id: "req-2", orders: { order_ref: "REF-2", total_amount: 10000 } }], 
      error: null 
    });
    mockInsertSingle.mockResolvedValue({ data: { id: "req-1" }, error: null });
  });

  describe("GET", () => {
    it("returns 200 and data with or without orders relation", async () => {
      const req = new Request("http://localhost/api/cancellations");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toHaveLength(2);
      expect(json.data[0].orderRef).toBe("");
      expect(json.data[1].orderRef).toBe("REF-2");
    });

    it("returns 200 and filters by status", async () => {
      const req = new Request("http://localhost/api/cancellations?status=PENDING");
      const res = await GET(req);
      expect(res.status).toBe(200);
    });

    it("returns 500 on query error", async () => {
      mockGetResult.mockResolvedValue({ data: null, error: { message: "DB Error" } });
      const req = new Request("http://localhost/api/cancellations");
      const res = await GET(req);
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe("DB Error");
    });
  });

  describe("POST", () => {
    it("returns 400 for invalid JSON body", async () => {
      const req = new Request("http://localhost/api/cancellations", {
        method: "POST",
        body: "not-json",
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("returns 400 if orderId is missing", async () => {
      const req = new Request("http://localhost/api/cancellations", {
        method: "POST",
        body: JSON.stringify({ requestedBy: "Kasir Test" }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("orderId is required");
    });

    it("returns 400 if requestedBy is missing", async () => {
      const req = new Request("http://localhost/api/cancellations", {
        method: "POST",
        body: JSON.stringify({ orderId: "ord-1" }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("requestedBy is required");
    });

    it("returns 409 if pending cancellation already exists", async () => {
      mockMaybeSingle.mockResolvedValue({ data: { id: "req-already" }, error: null });
      const req = new Request("http://localhost/api/cancellations", {
        method: "POST",
        body: JSON.stringify({ orderId: "ord-1", requestedBy: "Kasir Test" }),
      });
      const res = await POST(req);
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toBe("Sudah ada permintaan pembatalan yang menunggu persetujuan");
    });

    it("returns 500 if insert fails", async () => {
      mockInsertSingle.mockResolvedValue({ data: null, error: { message: "Insert Error" } });
      const req = new Request("http://localhost/api/cancellations", {
        method: "POST",
        body: JSON.stringify({
          orderId: "ord-1",
          requestedBy: "Kasir Test"
        }),
      });
      const res = await POST(req);
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe("Insert Error");
    });

    it("returns 201 on success", async () => {
      const req = new Request("http://localhost/api/cancellations", {
        method: "POST",
        body: JSON.stringify({
          orderId: "ord-1",
          requestedBy: "Kasir Test"
        }),
      });
      const res = await POST(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.id).toBe("req-1");
    });
  });
});
