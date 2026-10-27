import { describe, it, expect, vi } from "vitest";
import { POST } from "@/app/api/bonuses/consume/route";

vi.mock("@/lib/db-client");

describe("/api/bonuses/consume", () => {
  it("returns 400 for missing fields", async () => {
    const req = new Request("http://localhost/api/bonuses/consume", {
      method: "POST",
      body: JSON.stringify({ qty: 1 }), // missing id
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid json", async () => {
    const req = new Request("http://localhost/api/bonuses/consume", {
      method: "POST",
      body: "invalid",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 on db error", async () => {
    const { createAdminClient } = await import("@/lib/db-client");
    const adminMock = {
      rpc: vi.fn().mockResolvedValue({ error: new Error("fail") }),
    };
    vi.mocked(createAdminClient).mockReturnValueOnce(adminMock as any);

    const req = new Request("http://localhost/api/bonuses/consume", {
      method: "POST",
      body: JSON.stringify({ id: "1", qty: 1 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 200 on success", async () => {
    const { createAdminClient } = await import("@/lib/db-client");
    const adminMock = {
      rpc: vi.fn().mockResolvedValue({ data: [{ remaining: 5, stock: 10 }] }),
    };
    vi.mocked(createAdminClient).mockReturnValueOnce(adminMock as any);

    const req = new Request("http://localhost/api/bonuses/consume", {
      method: "POST",
      body: JSON.stringify({ id: "1", qty: 1 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });
});
