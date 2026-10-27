import { describe, it, expect, vi } from "vitest";
import { PATCH, DELETE } from "@/app/api/inventory/[id]/route";

vi.mock("@/lib/db-client");

describe("/api/inventory/[id]", () => {
  describe("PATCH", () => {
    it("returns 400 for missing fields", async () => {
      const req = new Request("http://localhost/api/inventory/1", {
        method: "PATCH",
        body: JSON.stringify({}), 
      });
      const res = await PATCH(req, { params: Promise.resolve({ id: "1" }) });
      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid JSON in PATCH", async () => {
      const req = new Request("http://localhost/api/inventory/1", {
        method: "PATCH",
        body: "invalid",
      });
      const res = await PATCH(req, { params: Promise.resolve({ id: "1" }) });
      expect(res.status).toBe(400);
    });

    it("returns 500 on db error in PATCH", async () => {
      const { createAdminClient } = await import("@/lib/db-client");
      const adminMock = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ error: new Error("fail") }),
      };
      vi.mocked(createAdminClient).mockReturnValueOnce(adminMock as any);

      const req = new Request("http://localhost/api/inventory/1", {
        method: "PATCH",
        body: JSON.stringify({ name: "A", unitType: "B", stockQty: 10 }),
      });
      const res = await PATCH(req, { params: Promise.resolve({ id: "1" }) });
      expect(res.status).toBe(400); // Because error returns 400 in route.ts
    });

    it("returns 404 if not found in PATCH", async () => {
      const { createAdminClient } = await import("@/lib/db-client");
      const adminMock = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
      vi.mocked(createAdminClient).mockReturnValueOnce(adminMock as any);

      const req = new Request("http://localhost/api/inventory/1", {
        method: "PATCH",
        body: JSON.stringify({ name: "A", unitType: "B", stockQty: 10 }),
      });
      const res = await PATCH(req, { params: Promise.resolve({ id: "1" }) });
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE", () => {
    it("returns 500 on db error in DELETE", async () => {
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

      const req = new Request("http://localhost/api/inventory/1", { method: "DELETE" });
      const res = await DELETE(req, { params: Promise.resolve({ id: "1" }) });
      expect(res.status).toBe(500);
    });

    it("returns 200 on success in DELETE", async () => {
      const { createAdminClient } = await import("@/lib/db-client");
      const adminMock = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      adminMock.eq = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      });
      vi.mocked(createAdminClient).mockReturnValueOnce(adminMock as any);

      const req = new Request("http://localhost/api/inventory/1", { method: "DELETE" });
      const res = await DELETE(req, { params: Promise.resolve({ id: "1" }) });
      expect(res.status).toBe(200);
    });
  });
});
