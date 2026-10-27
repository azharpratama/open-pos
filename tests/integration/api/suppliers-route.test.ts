import { describe, it, expect } from "vitest";
import { GET, POST } from "@/app/api/suppliers/route";

describe("/api/suppliers", () => {
  describe("GET", () => {
    it("fetches the list of suppliers", async () => {
      const res = await GET();
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body).toHaveProperty("data");
      expect(Array.isArray(body.data)).toBe(true);
    });
  });

  describe("POST", () => {
    it("returns 400 if name is missing", async () => {
      const req = new Request("http://localhost/api/suppliers", {
        method: "POST",
        body: JSON.stringify({ location: "Jakarta" }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("creates a new supplier successfully", async () => {
      const timestamp = Date.now();
      const newSupplier = {
        name: `Supplier Test ${timestamp}`,
        location: "Jakarta",
        contact: "08111222333",
        notes: "Created via automated test",
      };

      const req = new Request("http://localhost/api/suppliers", {
        method: "POST",
        body: JSON.stringify(newSupplier),
      });

      const res = await POST(req);
      expect(res.status).toBe(201);

      const body = await res.json();
      expect(body.data.name).toBe(newSupplier.name);
      expect(body.data.location).toBe(newSupplier.location);
    });
  });
});
