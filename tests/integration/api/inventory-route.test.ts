import { describe, it, expect } from "vitest";
import { GET, POST } from "@/app/api/inventory/route";

describe("/api/inventory", () => {
  describe("GET", () => {
    it("fetches the list of raw materials (Bahan Baku)", async () => {
      const res = await GET();
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body).toHaveProperty("data");
      expect(Array.isArray(body.data)).toBe(true);
    });
  });

  describe("POST", () => {
    it("returns 400 for missing required fields", async () => {
      const req = new Request("http://localhost/api/inventory", {
        method: "POST",
        body: JSON.stringify({ stockQty: 10 }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("creates a new inventory item successfully", async () => {
      const timestamp = Date.now();
      const newItem = {
        name: `Bahan Baku Test ${timestamp}`,
        unitType: "kg",
        stockQty: 50,
        price: 150000,
      };

      const req = new Request("http://localhost/api/inventory", {
        method: "POST",
        body: JSON.stringify(newItem),
      });

      const res = await POST(req);
      expect(res.status).toBe(201);

      const body = await res.json();
      expect(body.data.name).toBe(newItem.name);
      expect(body.data.stockQty).toBe(50);
      expect(body.data.unitType).toBe("kg");
      expect(body.data.price).toBe(150000);
    });
  });
});
