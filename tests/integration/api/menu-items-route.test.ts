import { describe, it, expect } from "vitest";
import { GET, POST } from "@/app/api/menu-items/route";

describe("/api/menu-items", () => {
  describe("GET", () => {
    it("fetches the list of menu items for management with ingredient counts", async () => {
      const res = await GET();
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body).toHaveProperty("data");
      expect(Array.isArray(body.data)).toBe(true);
    });
  });

  describe("POST", () => {
    it("returns 400 if name is missing", async () => {
      const req = new Request("http://localhost/api/menu-items", {
        method: "POST",
        body: JSON.stringify({ category: "Kopi", price: 10000 }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("creates a new menu item successfully without ingredients", async () => {
      const timestamp = Date.now();
      const newMenu = {
        name: `Kopi Test ${timestamp}`,
        category: "Kopi",
        price: 25000,
        imageUrl: null,
        ingredients: [],
      };

      const req = new Request("http://localhost/api/menu-items", {
        method: "POST",
        body: JSON.stringify(newMenu),
      });

      const res = await POST(req);
      expect(res.status).toBe(201);

      const body = await res.json();
      expect(body.data.name).toBe(newMenu.name);
      expect(body.data.price).toBe(25000);
      expect(body.data.ingredientCount).toBe(0);
    });
  });
});
