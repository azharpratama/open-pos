import { describe, it, expect, vi } from "vitest";
import { GET, POST, DELETE } from "@/app/api/bonuses/route";

vi.mock("@/lib/db-client");

describe("/api/bonuses", () => {
  describe("GET", () => {
    it("fetches bonuses", async () => {
      const { createAdminClient } = await import("@/lib/db-client");
      const adminMock = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: [{ id: "1", employee_id: "e1", product_id: "p1", allocated: 10, remaining: 5 }],
        }),
      };
      vi.mocked(createAdminClient).mockReturnValueOnce(adminMock as any);

      const req = new Request("http://localhost/api/bonuses");
      const res = await GET();
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("data");
      expect(Array.isArray(body.data)).toBe(true);
    });

    it("returns 500 on db error in GET", async () => {
      const { createAdminClient } = await import("@/lib/db-client");
      const adminMock = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ error: new Error("fail") }),
      };
      vi.mocked(createAdminClient).mockReturnValueOnce(adminMock as any);

      const req = new Request("http://localhost/api/bonuses");
      const res = await GET();
      expect(res.status).toBe(500);
    });
  });

  describe("POST", () => {
    it("returns 400 for missing fields", async () => {
      const req = new Request("http://localhost/api/bonuses", {
        method: "POST",
        body: JSON.stringify({ type: "Performance" }), 
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid json in POST", async () => {
      const req = new Request("http://localhost/api/bonuses", {
        method: "POST",
        body: "invalid",
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("returns 400 on db error in POST", async () => {
      const { createAdminClient } = await import("@/lib/db-client");
      const adminMock = {
        from: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockResolvedValue({ error: new Error("fail") }),
      };
      vi.mocked(createAdminClient).mockReturnValueOnce(adminMock as any);

      const req = new Request("http://localhost/api/bonuses", {
        method: "POST",
        body: JSON.stringify({ employeeId: "1", productId: "p1", allocated: 1 }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("returns 200 on success", async () => {
      const { createAdminClient } = await import("@/lib/db-client");
      const adminMock = {
        from: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockResolvedValue({ error: null }),
      };
      vi.mocked(createAdminClient).mockReturnValueOnce(adminMock as any);

      const req = new Request("http://localhost/api/bonuses", {
        method: "POST",
        body: JSON.stringify({ employeeId: "1", productId: "p1", allocated: 1 }),
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
    });
  });

  describe("DELETE", () => {
    it("returns 400 for missing id", async () => {
      const req = new Request("http://localhost/api/bonuses", {
        method: "DELETE",
      });
      const res = await DELETE(req);
      expect(res.status).toBe(400);
    });

    it("returns 500 on db error in DELETE", async () => {
      const { createAdminClient } = await import("@/lib/db-client");
      const adminMock = {
        from: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: new Error("fail") }),
      };
      vi.mocked(createAdminClient).mockReturnValueOnce(adminMock as any);

      const req = new Request("http://localhost/api/bonuses?id=1", { method: "DELETE" });
      const res = await DELETE(req);
      expect(res.status).toBe(500);
    });

    it("returns 200 on success", async () => {
      const { createAdminClient } = await import("@/lib/db-client");
      const adminMock = {
        from: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };
      vi.mocked(createAdminClient).mockReturnValueOnce(adminMock as any);

      const req = new Request("http://localhost/api/bonuses?id=1", { method: "DELETE" });
      const res = await DELETE(req);
      expect(res.status).toBe(200);
    });
  });
});
