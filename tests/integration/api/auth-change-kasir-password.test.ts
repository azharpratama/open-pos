import { describe, it, expect, vi } from "vitest";
import { POST } from "@/app/api/auth/change-kasir-password/route";

vi.mock("@/lib/auth");
vi.mock("@/lib/db-client");

describe("/api/auth/change-kasir-password", () => {
  it("returns 400 for invalid JSON body", async () => {
    const req = new Request("http://localhost/api/auth/change-kasir-password", {
      method: "POST",
      body: "invalid",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing newPassword", async () => {
    const req = new Request("http://localhost/api/auth/change-kasir-password", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 401 if unauthenticated", async () => {
    const { createClient } = await import("@/lib/auth");
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    } as any);

    const req = new Request("http://localhost/api/auth/change-kasir-password", {
      method: "POST",
      body: JSON.stringify({ newPassword: "password123" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 403 if not OWNER", async () => {
    const { createClient } = await import("@/lib/auth");
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "1" } } }),
      },
    } as any);

    const { createAdminClient } = await import("@/lib/db-client");
    const adminMock = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { role: "karyawan" } }),
    };
    vi.mocked(createAdminClient).mockReturnValue(adminMock as any);

    const req = new Request("http://localhost/api/auth/change-kasir-password", {
      method: "POST",
      body: JSON.stringify({ newPassword: "password123" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("returns 404 if employee not found", async () => {
    const { createClient } = await import("@/lib/auth");
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "1" } } }),
      },
    } as any);

    const { createAdminClient } = await import("@/lib/db-client");
    const adminMock = {
      from: vi.fn().mockImplementation((table) => {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockImplementation((col, val) => {
             if (col === "id") {
               return { maybeSingle: vi.fn().mockResolvedValue({ data: { role: "owner" } }) };
             }
             if (col === "role") {
               return Promise.resolve({ data: [] });
             }
             return {};
          })
        };
      }),
    };
    vi.mocked(createAdminClient).mockReturnValue(adminMock as any);

    const req = new Request("http://localhost/api/auth/change-kasir-password", {
      method: "POST",
      body: JSON.stringify({ newPassword: "password123" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it("returns 500 if update fails", async () => {
    const { createClient } = await import("@/lib/auth");
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "1" } } }),
      },
    } as any);

    const { createAdminClient } = await import("@/lib/db-client");
    const adminMock = {
      from: vi.fn().mockImplementation((table) => {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockImplementation((col, val) => {
             if (col === "id") {
               return { maybeSingle: vi.fn().mockResolvedValue({ data: { role: "owner" } }) };
             }
             if (col === "role") {
               return Promise.resolve({ data: [{ id: "2" }] });
             }
             return {};
          })
        };
      }),
      auth: {
        admin: {
          updateUserById: vi.fn().mockResolvedValue({ error: new Error("fail") }),
        }
      }
    };
    vi.mocked(createAdminClient).mockReturnValue(adminMock as any);

    const req = new Request("http://localhost/api/auth/change-kasir-password", {
      method: "POST",
      body: JSON.stringify({ newPassword: "password123" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it("returns 200 on success", async () => {
    const { createClient } = await import("@/lib/auth");
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "1" } } }),
      },
    } as any);

    const { createAdminClient } = await import("@/lib/db-client");
    const adminMock = {
      from: vi.fn().mockImplementation((table) => {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockImplementation((col, val) => {
             if (col === "id") {
               return { maybeSingle: vi.fn().mockResolvedValue({ data: { role: "owner" } }) };
             }
             if (col === "role") {
               return Promise.resolve({ data: [{ id: "2" }] });
             }
             return {};
          })
        };
      }),
      auth: {
        admin: {
          updateUserById: vi.fn().mockResolvedValue({ error: null }),
        }
      },
      rpc: vi.fn().mockResolvedValue({ error: null }),
    };
    vi.mocked(createAdminClient).mockReturnValue(adminMock as any);

    const req = new Request("http://localhost/api/auth/change-kasir-password", {
      method: "POST",
      body: JSON.stringify({ newPassword: "password123" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });
});
