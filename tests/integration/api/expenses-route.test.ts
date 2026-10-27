import { describe, it, expect, vi } from "vitest";
import { POST, GET } from "@/app/api/expenses/route";

vi.mock("@/lib/db-client");

describe("/api/expenses", () => {
  describe("POST", () => {
    it("returns 400 for invalid JSON body", async () => {
      const req = new Request("http://localhost/api/expenses", {
        method: "POST",
        body: "invalid-json",
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("returns 400 for missing note", async () => {
      const req = new Request("http://localhost/api/expenses", {
        method: "POST",
        body: JSON.stringify({ total: 100 }), 
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid total", async () => {
      const req = new Request("http://localhost/api/expenses", {
        method: "POST",
        body: JSON.stringify({ note: "Test", total: "invalid" }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("returns 201 on success", async () => {
      const { createAdminClient } = await import("@/lib/db-client");
      const adminMock = {
        from: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: "1" } }),
      };
      vi.mocked(createAdminClient).mockReturnValueOnce(adminMock as any);

      const req = new Request("http://localhost/api/expenses", {
        method: "POST",
        body: JSON.stringify({ note: "Test", total: 100 }),
      });
      const res = await POST(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.id).toBe("1");
    });

    it("returns 400 on db insert failure", async () => {
      const { createAdminClient } = await import("@/lib/db-client");
      const adminMock = {
        from: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ error: new Error("fail") }),
      };
      vi.mocked(createAdminClient).mockReturnValueOnce(adminMock as any);

      const req = new Request("http://localhost/api/expenses", {
        method: "POST",
        body: JSON.stringify({ note: "Test", total: 100 }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });
  });

  describe("GET", () => {
    it("returns 500 on db error", async () => {
      const { createAdminClient } = await import("@/lib/db-client");
      const adminMock = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ error: new Error("fail") }),
      };
      vi.mocked(createAdminClient).mockReturnValueOnce(adminMock as any);

      const req = new Request("http://localhost/api/expenses");
      const res = await GET();
      expect(res.status).toBe(500);
    });

    it("returns 200 on success", async () => {
      const { createAdminClient } = await import("@/lib/db-client");
      const adminMock = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [{ id: "1", total: 100, note: "Test", kind: "operasional" }],
        }),
      };
      vi.mocked(createAdminClient).mockReturnValueOnce(adminMock as any);

      const req = new Request("http://localhost/api/expenses");
      const res = await GET();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data[0].id).toBe("1");
    });
  });
});
