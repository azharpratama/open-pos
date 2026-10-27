import { describe, it, expect } from "vitest";
import { GET, POST } from "@/app/api/salary/route";

describe("/api/salary", () => {
  describe("GET", () => {
    it("fetches the daily salary calculation", async () => {
      const req = new Request("http://localhost/api/salary");
      const res = await GET(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body).toHaveProperty("data");
      
      const data = body.data;
      expect(typeof data.date).toBe("string");
      expect(typeof data.total).toBe("number");
      expect(typeof data.employeeCount).toBe("number");
      expect(typeof data.recorded).toBe("boolean");
    });
  });

  describe("POST", () => {
    it("records the daily salary", async () => {
      // Using a test date to avoid polluting today's real salary record if possible
      const req = new Request("http://localhost/api/salary", {
        method: "POST",
        body: JSON.stringify({ date: "2026-12-31" }),
      });
      const res = await POST(req);
      
      // It returns 200/201 on success. Since 2026-12-31 has no shifts, it might return total=0.
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.data.date).toBe("2026-12-31");
      expect(body.data.total).toBe(0);
      expect(body.data.employeeCount).toBe(0);
    });
  });
});
