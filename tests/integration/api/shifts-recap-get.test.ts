import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/shifts/recap/route";

describe("GET /api/shifts/recap", () => {
  it("fetches the 14-day shift recap", async () => {
    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty("data");
    expect(Array.isArray(body.data)).toBe(true);

    if (body.data.length > 0) {
      const first = body.data[0];
      expect(first).toHaveProperty("operationalDate");
      expect(first).toHaveProperty("siang");
      expect(first).toHaveProperty("malam");
      expect(first).toHaveProperty("luar");
      expect(first).toHaveProperty("total");
      expect(first).toHaveProperty("siangRunning");
      expect(first).toHaveProperty("malamRunning");
    }
  });
});
