import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/cashiers/route";

describe("/api/cashiers", () => {
  it("fetches the list of cashiers", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("data");
    expect(Array.isArray(body.data)).toBe(true);
  });
});
