import { describe, it, expect, vi } from "vitest";
import { PATCH } from "@/app/api/orders/[ref]/route";

vi.mock("@/lib/db-client");

describe("/api/orders/[ref]", () => {
  describe("PATCH", () => {
    it("returns 400 for invalid status", async () => {
      const req = new Request("http://localhost/api/orders/1", {
        method: "PATCH",
        body: JSON.stringify({ status: "INVALID" }), 
      });
      const res = await PATCH(req, { params: Promise.resolve({ ref: "1" }) });
      expect(res.status).toBe(400);
    });

    it("returns 404 if order not found", async () => {
      const { createAdminClient } = await import("@/lib/db-client");
      const adminMock = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      };
      vi.mocked(createAdminClient).mockReturnValueOnce(adminMock as any);

      const req = new Request("http://localhost/api/orders/REF123", {
        method: "PATCH",
        body: JSON.stringify({ orderStatus: "SELESAI" }),
      });
      const res = await PATCH(req, { params: Promise.resolve({ ref: "REF123" }) });
      expect(res.status).toBe(404);
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

      const req = new Request("http://localhost/api/orders/REF123", {
        method: "PATCH",
        body: JSON.stringify({ orderStatus: "SELESAI" }),
      });
      const res = await PATCH(req, { params: Promise.resolve({ ref: "REF123" }) });
      expect(res.status).toBe(500); 
    });
  });
});
