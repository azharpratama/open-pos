import { describe, it, expect } from "vitest";
import { POST } from "@/app/api/orders/route";

describe("/api/orders", () => {
  describe("POST", () => {
    it("returns 400 for invalid JSON body", async () => {
      const req = new Request("http://localhost/api/orders", {
        method: "POST",
        body: "not-json",
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("returns 400 for completely missing fields", async () => {
      const req = new Request("http://localhost/api/orders", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("returns 400 if cashier name is missing", async () => {
      const req = new Request("http://localhost/api/orders", {
        method: "POST",
        body: JSON.stringify({
          clientRef: "123",
          paymentMethod: "CASH",
          customerName: "Test",
          subtotal: 10000,
          discount: 0,
          total: 10000,
          items: [],
        }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("orderRef is required");
    });
  });
});
