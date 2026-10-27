import { describe, it, expect, vi } from "vitest";
import { POST } from "@/app/api/menu-items/upload/route";

vi.mock("@/lib/db-client");

describe("/api/menu-items/upload", () => {
  describe("POST", () => {
    it("returns 400 for missing file", async () => {
      const formData = new FormData();
      const req = new Request("http://localhost/api/menu-items/upload", {
        method: "POST",
        body: formData,
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("returns 400 on upload error", async () => {
      const { createAdminClient } = await import("@/lib/db-client");
      const adminMock = {
        storage: {
          from: vi.fn().mockReturnThis(),
          upload: vi.fn().mockResolvedValue({ error: new Error("fail") }),
        },
      };
      vi.mocked(createAdminClient).mockReturnValueOnce(adminMock as any);

      const formData = new FormData();
      formData.append("file", new Blob(["test"], { type: "image/png" }));
      const req = new Request("http://localhost/api/menu-items/upload", {
        method: "POST",
        body: formData,
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("returns 201 on success", async () => {
      const { createAdminClient } = await import("@/lib/db-client");
      const adminMock = {
        storage: {
          from: vi.fn().mockReturnThis(),
          upload: vi.fn().mockResolvedValue({ error: null }),
          getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "http://url" } }),
        },
      };
      vi.mocked(createAdminClient).mockReturnValueOnce(adminMock as any);

      const formData = new FormData();
      formData.append("file", new Blob(["test"], { type: "image/png" }));
      const req = new Request("http://localhost/api/menu-items/upload", {
        method: "POST",
        body: formData,
      });
      const res = await POST(req);
      expect(res.status).toBe(201);
    });
  });
});
