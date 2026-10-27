import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/dashboard/trend/route";

describe("/api/dashboard/trend", () => {
  it("fetches the revenue trend", async () => {
    const req = new Request("http://localhost/api/dashboard/trend");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("data");
    expect(Array.isArray(body.data)).toBe(true);
  });
});
