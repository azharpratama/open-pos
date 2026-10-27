import { describe, it, expect } from "vitest";
import { GET, POST } from "@/app/api/purchases/route";

describe("/api/purchases", () => {
  describe("GET", () => {
    it("fetches the list of purchases with items and suppliers", async () => {
      const res = await GET();
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body).toHaveProperty("data");
      expect(Array.isArray(body.data)).toBe(true);
    });
  });

  describe("POST", () => {
    it("returns 400 if supplierId is missing", async () => {
      const req = new Request("http://localhost/api/purchases", {
        method: "POST",
        body: JSON.stringify({ note: "Test purchase", items: [] }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("Supplier wajib dipilih");
    });

    it("returns 400 if items array is empty", async () => {
      const req = new Request("http://localhost/api/purchases", {
        method: "POST",
        body: JSON.stringify({ supplierId: "some-uuid", items: [] }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("Pembelian harus punya minimal satu item");
    });

    it("returns 400 if item fields are invalid", async () => {
      const req = new Request("http://localhost/api/purchases", {
        method: "POST",
        body: JSON.stringify({ 
          supplierId: "some-uuid", 
          items: [{ productId: "uuid", qty: -5, unitCost: 1000 }] // Invalid qty
        }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });
  });
});
