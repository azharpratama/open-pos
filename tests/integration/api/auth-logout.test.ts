import { describe, it, expect, vi } from "vitest";
import { POST } from "@/app/api/auth/logout/route";

vi.mock("@/lib/auth");

describe("/api/auth/logout", () => {
  it("returns 200 on success", async () => {
    const { createClient } = await import("@/lib/auth");
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
    } as any);

    const req = new Request("http://localhost/api/auth/logout", { method: "POST" });
    const res = await POST();
    expect(res.status).toBe(200);
  });
});
