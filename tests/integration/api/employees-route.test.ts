import { describe, it, expect } from "vitest";
import { GET, POST } from "@/app/api/employees/route";

describe("/api/employees", () => {
  describe("GET", () => {
    it("fetches the list of active employees", async () => {
      const res = await GET();
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body).toHaveProperty("data");
      expect(Array.isArray(body.data)).toBe(true);
    });
  });

  describe("POST", () => {
    it("returns 400 for invalid JSON body", async () => {
      const req = new Request("http://localhost/api/employees", {
        method: "POST",
        body: "not-json",
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("returns 400 for missing required fields", async () => {
      const req = new Request("http://localhost/api/employees", {
        method: "POST",
        body: JSON.stringify({ bankName: "BCA" }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      
      const body = await res.json();
      expect(body.error).toBe("Nama karyawan wajib diisi");
    });

    it("creates a new employee successfully", async () => {
      const timestamp = Date.now();
      const newEmployee = {
        name: `Test Employee ${timestamp}`,
        bankAccountNo: "1234567890",
        bankName: "BCA",
        phone: "08123456789",
        shiftCount: 0,
        dailyWage: 75000,
      };

      const req = new Request("http://localhost/api/employees", {
        method: "POST",
        body: JSON.stringify(newEmployee),
      });

      const res = await POST(req);
      expect(res.status).toBe(201);

      const body = await res.json();
      expect(body.data.name).toBe(newEmployee.name);
      expect(body.data.dailyWage).toBe(75000);
    });
  });
});
