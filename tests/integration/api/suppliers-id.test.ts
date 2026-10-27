import { describe, it, expect, vi } from "vitest";
import { PATCH, DELETE } from "@/app/api/suppliers/[id]/route";

vi.mock("@/lib/db-client");

describe("/api/suppliers/[id]", () => {
  describe("PATCH", () => {
    it("returns 400 for missing fields", async () => {
      const req = new Request("http://localhost/api/suppliers/1", {
        method: "PATCH",
        body: JSON.stringify({}), 
      });
      const res = await PATCH(req, { params: Promise.resolve({ id: "1" }) });
      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid JSON in PATCH", async () => {
      const req = new Request("http://localhost/api/suppliers/1", {
        method: "PATCH",
        body: "invalid",
      });
      const res = await PATCH(req, { params: Promise.resolve({ id: "1" }) });
      expect(res.status).toBe(400);
    });

    it("returns 400 on db error in PATCH", async () => {
      const { createAdminClient } = await import("@/lib/db-client");
      const adminMock = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ error: new Error("fail") }),
      };
      vi.mocked(createAdminClient).mockReturnValueOnce(adminMock as any);

      const req = new Request("http://localhost/api/suppliers/1", {
        method: "PATCH",
        body: JSON.stringify({ name: "A" }),
      });
      const res = await PATCH(req, { params: Promise.resolve({ id: "1" }) });
      expect(res.status).toBe(400);
    });
  });

  describe("DELETE", () => {
    it("returns non-200 for invalid id", async () => {
      const { createAdminClient } = await import("@/lib/db-client");
      vi.mocked(createAdminClient).mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: new Error("fail") }),
      } as any);
      
      const req = new Request("http://localhost/api/suppliers/invalid-uuid", {
        method: "DELETE",
      });
      const res = await DELETE(req, { params: Promise.resolve({ id: "invalid-uuid" }) });
      expect(res.status).not.toBe(200);
    });

    it("returns 500 on db error in DELETE", async () => {
      const { createAdminClient } = await import("@/lib/db-client");
      const adminMock = {
        from: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: new Error("fail") }),
      };
      vi.mocked(createAdminClient).mockReturnValueOnce(adminMock as any);

      const req = new Request("http://localhost/api/suppliers/1", { method: "DELETE" });
      const res = await DELETE(req, { params: Promise.resolve({ id: "1" }) });
      expect(res.status).toBe(500);
    });
  });
});
