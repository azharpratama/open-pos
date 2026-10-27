import { describe, it, expect } from "vitest";
import { GET, POST } from "@/app/api/shift-schedules/route";

describe("/api/shift-schedules", () => {
  describe("GET", () => {
    it("returns 400 if from/to are missing", async () => {
      const req = new Request("http://localhost/api/shift-schedules");
      const res = await GET(req);
      expect(res.status).toBe(400);
    });

    it("fetches schedules within a valid date range", async () => {
      const req = new Request("http://localhost/api/shift-schedules?from=2026-07-01&to=2026-07-31");
      const res = await GET(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body).toHaveProperty("data");
      expect(Array.isArray(body.data)).toBe(true);
    });
  });

  describe("POST", () => {
    it("returns 400 if shiftType is invalid", async () => {
      const req = new Request("http://localhost/api/shift-schedules", {
        method: "POST",
        body: JSON.stringify({ workDate: "2026-12-31", shiftType: "INVALID" }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("saves shift schedule successfully", async () => {
      const req = new Request("http://localhost/api/shift-schedules", {
        method: "POST",
        body: JSON.stringify({
          workDate: "2026-12-31",
          shiftType: "SIANG",
          employeeIds: [], // Empty for test so we don't need real employee IDs
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200); // The API returns 200 on success for shift schedules

      const body = await res.json();
      expect(body.data.workDate).toBe("2026-12-31");
      expect(body.data.shiftType).toBe("SIANG");
    });
  });
});
