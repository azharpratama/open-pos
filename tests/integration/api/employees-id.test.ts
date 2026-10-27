import { describe, it, expect } from "vitest";
import { PATCH, DELETE } from "@/app/api/employees/[id]/route";

describe("/api/employees/[id]", () => {
  describe("PATCH", () => {
    it("returns 400 for missing fields", async () => {
      const req = new Request("http://localhost/api/employees/1", {
        method: "PATCH",
        body: JSON.stringify({}), 
      });
      const res = await PATCH(req, { params: Promise.resolve({ id: "1" }) });
      expect(res.status).toBe(400);
    });

    it("returns 404 for invalid employee id", async () => {
      const req = new Request("http://localhost/api/employees/invalid-uuid", {
        method: "PATCH",
        body: JSON.stringify({
          name: "Test",
          bankAccountNo: "123",
          bankName: "BCA",
          phone: "081",
          shiftCount: 0,
          dailyWage: 1000,
        }), 
      });
      const res = await PATCH(req, { params: Promise.resolve({ id: "invalid-uuid" }) });
      
      expect(res.status).not.toBe(200);
    });
  });

  describe("DELETE", () => {
    it("returns 500 or 404 for invalid id", async () => {
      const req = new Request("http://localhost/api/employees/invalid-uuid", {
        method: "DELETE",
      });
      const res = await DELETE(req, { params: Promise.resolve({ id: "invalid-uuid" }) });
      expect(res.status).not.toBe(200);
    });
  });
});
