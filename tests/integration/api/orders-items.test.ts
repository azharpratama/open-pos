import { describe, it, expect, vi } from "vitest";
import { POST } from "@/app/api/orders/[ref]/items/route";

vi.mock("@/lib/db-client", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ 
            data: { id: "1", is_open_bill: true, reservation_id: null }, 
            error: null 
          })
        }))
      }))
    })),
    rpc: vi.fn().mockResolvedValue({ data: { new_subtotal: 15000, new_total: 15000 }, error: null })
  }))
}));

describe("/api/orders/[ref]/items", () => {
  describe("POST", () => {
    it("returns 400 for invalid JSON body", async () => {
      const req = new Request("http://localhost/api/orders/REF-1/items", {
        method: "POST",
        body: "not-json",
      });
      const res = await POST(req, { params: Promise.resolve({ ref: "REF-1" }) });
      expect(res.status).toBe(400);
    });

    it("returns 400 if items is missing or empty", async () => {
      const req = new Request("http://localhost/api/orders/REF-1/items", {
        method: "POST",
        body: JSON.stringify({ items: [] }),
      });
      const res = await POST(req, { params: Promise.resolve({ ref: "REF-1" }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("items must be a non-empty array");
    });

    it("returns 400 if an item is invalid", async () => {
      const req = new Request("http://localhost/api/orders/REF-1/items", {
        method: "POST",
        body: JSON.stringify({ items: [{ productId: "p1", qty: -1 }] }),
      });
      const res = await POST(req, { params: Promise.resolve({ ref: "REF-1" }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Each item needs a productId and a positive qty");
    });

    it("returns 200 on success", async () => {
      const req = new Request("http://localhost/api/orders/REF-1/items", {
        method: "POST",
        body: JSON.stringify({ items: [{ productId: "p1", qty: 2 }] }),
      });
      const res = await POST(req, { params: Promise.resolve({ ref: "REF-1" }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.newSubtotal).toBe(15000);
      expect(json.data.newTotal).toBe(15000);
    });
  });
});
