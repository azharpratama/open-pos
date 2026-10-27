import { describe, it, expect, vi } from "vitest";
import { POST } from "@/app/api/auth/change-password/route";

vi.mock("@/lib/auth");
vi.mock("@/lib/db-client");

describe("/api/auth/change-password", () => {
  it("returns 400 for invalid JSON body", async () => {
    const req = new Request("http://localhost/api/auth/change-password", {
      method: "POST",
      body: "invalid",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing passwords", async () => {
    const req = new Request("http://localhost/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 if new password < 6 chars", async () => {
    const req = new Request("http://localhost/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword: "old", newPassword: "pass" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 if new password equals old password", async () => {
    const req = new Request("http://localhost/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword: "password123", newPassword: "password123" }),
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

    const req = new Request("http://localhost/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword: "oldpassword", newPassword: "newpassword" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 401 if current password is wrong", async () => {
    const { createClient } = await import("@/lib/auth");
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "1", email: "test@example.com" } } }),
        signInWithPassword: vi.fn().mockResolvedValue({ error: new Error("wrong pass") }),
      },
    } as any);

    const req = new Request("http://localhost/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword: "wrongpassword", newPassword: "newpassword" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 500 on update error", async () => {
    const { createClient } = await import("@/lib/auth");
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "1", email: "test@example.com" } } }),
        signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
      },
    } as any);

    const { createAdminClient } = await import("@/lib/db-client");
    vi.mocked(createAdminClient).mockReturnValueOnce({
      auth: {
        admin: {
          updateUserById: vi.fn().mockResolvedValue({ error: new Error("update fail") }),
        }
      }
    } as any);

    const req = new Request("http://localhost/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword: "oldpassword", newPassword: "newpassword" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it("returns 200 on success", async () => {
    const { createClient } = await import("@/lib/auth");
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "1", email: "test@example.com" } } }),
        signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
      },
    } as any);

    const { createAdminClient } = await import("@/lib/db-client");
    vi.mocked(createAdminClient).mockReturnValueOnce({
      auth: {
        admin: {
          updateUserById: vi.fn().mockResolvedValue({ error: null }),
        }
      }
    } as any);

    const req = new Request("http://localhost/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword: "oldpassword", newPassword: "newpassword" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });
});
