import { describe, it, expect } from "vitest";
import { GET, POST, PATCH } from "@/app/api/shifts/route";

describe("/api/shifts", () => {
  describe("GET", () => {
    it("fetches recent shifts from the database", async () => {
      const res = await GET();
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body).toHaveProperty("data");
      expect(Array.isArray(body.data)).toBe(true);
    });
  });

  describe("POST", () => {
    it("opens a new shift or returns the existing open one", async () => {
      const res = await POST();
      // It returns 201 if created, 200 if reused
      expect([200, 201]).toContain(res.status);

      const body = await res.json();
      expect(body.data).toHaveProperty("id");
      expect(body.data).toHaveProperty("openedAt");
    });
  });

  describe("PATCH", () => {
    // The revenue is summed from the paid orders on the server; the client no
    // longer supplies (or can distort) it.
    it("closes the open shift and records revenue", async () => {
      const res = await PATCH();

      // If a shift was open, it closes it (200). If no shift was open, it returns 404.
      expect([200, 404]).toContain(res.status);

      const body = await res.json();
      if (res.status === 200) {
        expect(body.data).toHaveProperty("closedAt");
        expect(typeof body.data.revenue).toBe("number");
        expect(body.data.revenue).toBeGreaterThanOrEqual(0);
      } else {
        expect(body.error).toBe("Tidak ada shift yang sedang berjalan");
      }
    });
  });
});
