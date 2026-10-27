import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/reservations/route";

let mockInsertSingle = vi.fn();
let mockGetResult = vi.fn();

vi.mock("@/lib/db-client", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          order: vi.fn(() => ({
            gte: vi.fn(() => ({
              lte: vi.fn(() => ({
                eq: vi.fn(() => ({
                  then: (res: any) => res(mockGetResult())
                }))
              }))
            })),
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                then: (res: any) => res(mockGetResult())
              })),
              then: (res: any) => res(mockGetResult())
            })),
            then: (res: any) => res(mockGetResult())
          })),
          gte: vi.fn(() => ({
            lte: vi.fn(() => ({
              eq: vi.fn(() => ({
                then: (res: any) => res(mockGetResult())
              }))
            }))
          })),
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              then: (res: any) => res(mockGetResult())
            })),
            then: (res: any) => res(mockGetResult())
          })),
          then: (res: any) => res(mockGetResult())
        })),
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: { value: { amount: 200000 } }, error: null })
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: mockInsertSingle
        }))
      }))
    }))
  }))
}));

describe("/api/reservations", () => {
  beforeEach(() => {
    mockInsertSingle.mockResolvedValue({ data: { id: "res-1" }, error: null });
    mockGetResult.mockResolvedValue({ data: [], error: null });
  });

  describe("GET", () => {
    it("returns 200 and data", async () => {
      const req = new Request("http://localhost/api/reservations");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toEqual([]);
    });

    it("filters by date", async () => {
      const req = new Request("http://localhost/api/reservations?date=2023-01-01");
      const res = await GET(req);
      expect(res.status).toBe(200);
    });

    it("filters by floor", async () => {
      const req = new Request("http://localhost/api/reservations?floor=1");
      const res = await GET(req);
      expect(res.status).toBe(200);
    });

    it("returns 500 on query error", async () => {
      mockGetResult.mockResolvedValue({ data: null, error: { message: "GET Error" } });
      const req = new Request("http://localhost/api/reservations");
      const res = await GET(req);
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe("GET Error");
    });
  });

  describe("POST", () => {
    it("returns 400 for invalid JSON body", async () => {
      const req = new Request("http://localhost/api/reservations", {
        method: "POST",
        body: "not-json",
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("returns 400 if customerName is missing", async () => {
      const req = new Request("http://localhost/api/reservations", {
        method: "POST",
        body: JSON.stringify({ floorNumber: 1, reservationDate: "2023-01-01", startTime: "10:00", endTime: "12:00" }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("customerName is required");
    });

    it("returns 400 if floorNumber is invalid", async () => {
      const req = new Request("http://localhost/api/reservations", {
        method: "POST",
        body: JSON.stringify({ customerName: "Test", floorNumber: 0, reservationDate: "2023-01-01", startTime: "10:00", endTime: "12:00" }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("floorNumber must be a positive number");
    });

    it("returns 400 if reservationDate is missing", async () => {
      const req = new Request("http://localhost/api/reservations", {
        method: "POST",
        body: JSON.stringify({ customerName: "Test", floorNumber: 1, startTime: "10:00", endTime: "12:00" }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("reservationDate is required");
    });

    it("returns 400 if time is missing", async () => {
      const req = new Request("http://localhost/api/reservations", {
        method: "POST",
        body: JSON.stringify({ customerName: "Test", floorNumber: 1, reservationDate: "2023-01-01" }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("startTime and endTime are required");
    });

    it("returns 409 if overlapping reservation exists", async () => {
      mockInsertSingle.mockResolvedValue({ data: null, error: { message: "Sudah ada reservasi yang bentrok" } });
      const req = new Request("http://localhost/api/reservations", {
        method: "POST",
        body: JSON.stringify({
          customerName: "Test",
          floorNumber: 1,
          reservationDate: "2023-01-01",
          startTime: "10:00",
          endTime: "12:00"
        }),
      });
      const res = await POST(req);
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toBe("Sudah ada reservasi yang bentrok");
    });

    it("returns 500 on db insert error", async () => {
      mockInsertSingle.mockResolvedValue({ data: null, error: { message: "Insert Error" } });
      const req = new Request("http://localhost/api/reservations", {
        method: "POST",
        body: JSON.stringify({
          customerName: "Test",
          floorNumber: 1,
          reservationDate: "2023-01-01",
          startTime: "10:00",
          endTime: "12:00"
        }),
      });
      const res = await POST(req);
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe("Insert Error");
    });

    it("returns 201 on success", async () => {
      const req = new Request("http://localhost/api/reservations", {
        method: "POST",
        body: JSON.stringify({
          customerName: "Test",
          floorNumber: 1,
          reservationDate: "2023-01-01",
          startTime: "10:00",
          endTime: "12:00"
        }),
      });
      const res = await POST(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.id).toBe("res-1");
    });
  });
});
