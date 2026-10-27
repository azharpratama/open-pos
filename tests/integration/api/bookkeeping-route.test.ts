import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/bookkeeping/route";

describe("/api/bookkeeping", () => {
  it("fetches bookkeeping for a month", async () => {
    const req = new Request("http://localhost/api/bookkeeping?month=2026-07");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("data");
  });
});
