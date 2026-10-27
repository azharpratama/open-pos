import { describe, it, expect, vi, beforeEach } from "vitest";
import { PATCH } from "@/app/api/cancellations/[id]/route";

let mockMaybeSingle = vi.fn();
let mockUpdate = vi.fn();
let mockRpc = vi.fn();

vi.mock("@/lib/db-client", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: mockMaybeSingle,
          single: vi.fn().mockResolvedValue({ data: { reservation_id: null }, error: null })
        }))
      })),
      update: vi.fn(() => ({
        eq: mockUpdate
      }))
    })),
    rpc: mockRpc
  }))
}));

describe("/api/cancellations/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMaybeSingle.mockResolvedValue({ data: { id: "req-1", status: "PENDING", order_id: "ord-1" }, error: null });
    mockUpdate.mockResolvedValue({ error: null });
    mockRpc.mockResolvedValue({ error: null });
  });

  describe("PATCH", () => {
    it("returns 400 for invalid JSON body", async () => {
      const req = new Request("http://localhost/api/cancellations/req-1", {
        method: "PATCH",
        body: "not-json",
      });
      const res = await PATCH(req, { params: Promise.resolve({ id: "req-1" }) });
      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid action", async () => {
      const req = new Request("http://localhost/api/cancellations/req-1", {
        method: "PATCH",
        body: JSON.stringify({ action: "invalid" }),
      });
      const res = await PATCH(req, { params: Promise.resolve({ id: "req-1" }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("action must be \"approve\" or \"reject\"");
    });

    it("returns 404 if cancellation request not found", async () => {
      mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
      const req = new Request("http://localhost/api/cancellations/req-1", {
        method: "PATCH",
        body: JSON.stringify({ action: "approve" }),
      });
      const res = await PATCH(req, { params: Promise.resolve({ id: "req-1" }) });
      expect(res.status).toBe(404);
    });

    it("returns 400 if cancellation request is already processed", async () => {
      mockMaybeSingle.mockResolvedValueOnce({ data: { id: "req-1", status: "APPROVED", order_id: "ord-1" }, error: null });
      const req = new Request("http://localhost/api/cancellations/req-1", {
        method: "PATCH",
        body: JSON.stringify({ action: "approve" }),
      });
      const res = await PATCH(req, { params: Promise.resolve({ id: "req-1" }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Permintaan ini sudah diproses");
    });

    it("returns 200 and updates status on reject", async () => {
      const req = new Request("http://localhost/api/cancellations/req-1", {
        method: "PATCH",
        body: JSON.stringify({ action: "reject" }),
      });
      const res = await PATCH(req, { params: Promise.resolve({ id: "req-1" }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalled();
    });

    it("returns 500 if update fails on reject", async () => {
      mockUpdate.mockResolvedValueOnce({ error: { message: "Update Error" } });
      const req = new Request("http://localhost/api/cancellations/req-1", {
        method: "PATCH",
        body: JSON.stringify({ action: "reject" }),
      });
      const res = await PATCH(req, { params: Promise.resolve({ id: "req-1" }) });
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe("Update Error");
    });

    it("returns 200 and calls rpc on approve whole order", async () => {
      const req = new Request("http://localhost/api/cancellations/req-1", {
        method: "PATCH",
        body: JSON.stringify({ action: "approve" }),
      });
      const res = await PATCH(req, { params: Promise.resolve({ id: "req-1" }) });
      expect(res.status).toBe(200);
      expect(mockRpc).toHaveBeenCalledWith("cancel_order_transaction", expect.any(Object));
    });

    it("returns 500 if rpc fails on approve whole order", async () => {
      mockRpc.mockResolvedValueOnce({ error: { message: "RPC Error" } });
      const req = new Request("http://localhost/api/cancellations/req-1", {
        method: "PATCH",
        body: JSON.stringify({ action: "approve" }),
      });
      const res = await PATCH(req, { params: Promise.resolve({ id: "req-1" }) });
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe("RPC Error");
    });



    it("returns 200 and calls rpc on approve specific items", async () => {
      mockMaybeSingle.mockResolvedValueOnce({ data: { id: "req-1", status: "PENDING", order_id: "ord-1", item_ids: ["item-1"] }, error: null });
      const req = new Request("http://localhost/api/cancellations/req-1", {
        method: "PATCH",
        body: JSON.stringify({ action: "approve" }),
      });
      const res = await PATCH(req, { params: Promise.resolve({ id: "req-1" }) });
      expect(res.status).toBe(200);
      expect(mockRpc).toHaveBeenCalledWith("cancel_order_items", expect.any(Object));
    });

    it("returns 500 if rpc fails on approve specific items", async () => {
      mockMaybeSingle.mockResolvedValueOnce({ data: { id: "req-1", status: "PENDING", order_id: "ord-1", item_ids: ["item-1"] }, error: null });
      mockRpc.mockResolvedValueOnce({ error: { message: "RPC Items Error" } });
      const req = new Request("http://localhost/api/cancellations/req-1", {
        method: "PATCH",
        body: JSON.stringify({ action: "approve" }),
      });
      const res = await PATCH(req, { params: Promise.resolve({ id: "req-1" }) });
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe("RPC Items Error");
    });
  });
});
