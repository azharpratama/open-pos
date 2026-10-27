import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/salary/recorded/route";

describe("GET /api/salary/recorded", () => {
  it("returns 400 if from/to are missing", async () => {
    const req = new Request("http://localhost/api/salary/recorded");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("fetches recorded salary dates within a range", async () => {
    const req = new Request("http://localhost/api/salary/recorded?from=2026-07-01&to=2026-07-31");
    const res = await GET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty("data");
    expect(Array.isArray(body.data)).toBe(true);
  });
});
