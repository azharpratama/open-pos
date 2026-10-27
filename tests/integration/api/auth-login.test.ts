import { describe, it, expect, vi } from "vitest";
import { POST } from "@/app/api/auth/login/route";

vi.mock("@/lib/auth");
vi.mock("@/lib/db-client");

describe("/api/auth/login", () => {
  it("returns 400 for missing credentials", async () => {
    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: "invalid",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 401 for invalid credentials", async () => {
    const { createClient } = await import("@/lib/auth");
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { user: null },
          error: new Error("Invalid login credentials"),
        }),
      },
    } as any);

    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "invalid@example.com", password: "wrong" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 403 if role check fails or user has no role", async () => {
    const { createClient } = await import("@/lib/auth");
    const { createAdminClient } = await import("@/lib/db-client");

    const signOutMock = vi.fn();
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { user: { id: "123", app_metadata: {} } },
          error: null,
        }),
        signOut: signOutMock,
      },
    } as any);

    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    } as any);

    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com", password: "123" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
    expect(signOutMock).toHaveBeenCalled();
  });

  it("returns 403 if role doesn't match expected 'as' parameter (OWNER trying to be KASIR)", async () => {
    const { createClient } = await import("@/lib/auth");
    const { createAdminClient } = await import("@/lib/db-client");

    const signOutMock = vi.fn();
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { user: { id: "123", app_metadata: { role: "OWNER" } } },
          error: null,
        }),
        signOut: signOutMock,
      },
    } as any);

    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { role: "owner" } }),
    } as any);

    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "owner@openpos.dev", password: "123", as: "KASIR" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
    expect(signOutMock).toHaveBeenCalled();
  });

  it("returns 200 on success", async () => {
    const { createClient } = await import("@/lib/auth");
    const { createAdminClient } = await import("@/lib/db-client");

    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { user: { id: "123", app_metadata: { role: "KASIR" } } },
          error: null,
        }),
      },
    } as any);

    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { role: "karyawan", name: "Kasir Test" } }),
    } as any);

    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "kasir@openpos.dev", password: "123", as: "KASIR" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.role).toBe("KASIR");
    expect(json.data.name).toBe("Kasir Test");
  });
});
