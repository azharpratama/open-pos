import { describe, it, expect, vi } from "vitest";
import { GET, PATCH, DELETE } from "@/app/api/menu-items/[id]/route";

vi.mock("@/lib/db-client");
vi.mock("@/lib/menu-admin");

describe("/api/menu-items/[id]", () => {
  describe("GET", () => {
    it("returns 404 for invalid id", async () => {
      const { createAdminClient } = await import("@/lib/db-client");
      const adminMock = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
      vi.mocked(createAdminClient).mockReturnValueOnce(adminMock as any);

      const req = new Request("http://localhost/api/menu-items/1");
      const res = await GET(req, { params: Promise.resolve({ id: "1" }) });
      expect(res.status).toBe(404);
    });

    it("returns 200 on success", async () => {
      const { createAdminClient } = await import("@/lib/db-client");
      const adminMock = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: { id: "1" }, error: null }),
      };
      vi.mocked(createAdminClient).mockReturnValue(adminMock as any);

      const req = new Request("http://localhost/api/menu-items/1");
      const res = await GET(req, { params: Promise.resolve({ id: "1" }) });
      expect(res.status).toBe(200);
    });
  });

  describe("PATCH", () => {
    it("returns 400 for invalid JSON in PATCH", async () => {
      const req = new Request("http://localhost/api/menu-items/1", {
        method: "PATCH",
        body: "invalid",
      });
      const res = await PATCH(req, { params: Promise.resolve({ id: "1" }) });
      expect(res.status).toBe(400);
    });

    it("returns 400 on db error in PATCH", async () => {
      // It returns 400 on error in route.ts
      const { createAdminClient } = await import("@/lib/db-client");
      const adminMock = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ error: new Error("fail") }),
      };
      vi.mocked(createAdminClient).mockReturnValueOnce(adminMock as any);

      const req = new Request("http://localhost/api/menu-items/1", {
        method: "PATCH",
        body: JSON.stringify({ name: "A", category: "Kopi", price: 10, imageUrl: null, ingredients: [] }),
      });
      const res = await PATCH(req, { params: Promise.resolve({ id: "1" }) });
      expect(res.status).toBe(400);
    });
  });

  describe("DELETE", () => {
    it("returns 500 on db error", async () => {
      const { createAdminClient } = await import("@/lib/db-client");
      const adminMock = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      adminMock.eq = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: new Error("fail") })
      });
      vi.mocked(createAdminClient).mockReturnValueOnce(adminMock as any);

      const req = new Request("http://localhost/api/menu-items/1", { method: "DELETE" });
      const res = await DELETE(req, { params: Promise.resolve({ id: "1" }) });
      expect(res.status).toBe(500);
    });
  });
});
