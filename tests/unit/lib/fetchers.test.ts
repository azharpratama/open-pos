import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { fetchInventory } from "@/lib/inventory";
import { fetchPurchases } from "@/lib/purchases";
import { fetchEmployees } from "@/lib/employees";
import { fetchSalary, fetchRecordedSalaryDates } from "@/lib/salary";
import { fetchShiftRecap, openShiftRecord } from "@/lib/shifts";
import { fetchSchedule, setSlot } from "@/lib/shift-schedules";
import { fetchSuppliers } from "@/lib/suppliers";
import { fetchMenu } from "@/lib/menu";
import { fetchDashboard, fetchTrend } from "@/lib/dashboard";
import { fetchOrders } from "@/lib/orders";

describe("API Fetcher wrappers (lib/*.ts)", () => {
  let globalFetchMock: any;

  beforeEach(() => {
    globalFetchMock = vi.fn();
    global.fetch = globalFetchMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetchInventory", async () => {
    globalFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ id: "1" }] }),
    });
    const res = await fetchInventory();
    expect(res).toEqual([{ id: "1" }]);
  });

  it("fetchPurchases", async () => {
    globalFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ id: "1" }] }),
    });
    const res = await fetchPurchases();
    expect(res).toEqual([{ id: "1" }]);
  });

  it("fetchEmployees", async () => {
    globalFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ id: "1" }] }),
    });
    const res = await fetchEmployees();
    expect(res).toEqual([{ id: "1" }]);
  });

  it("fetchSalary", async () => {
    globalFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { total: 100 } }),
    });
    const res = await fetchSalary("2026-07-23");
    expect(res.total).toBe(100);
  });

  it("fetchRecordedSalaryDates", async () => {
    globalFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: ["2026-07-23"] }),
    });
    const res = await fetchRecordedSalaryDates("2026-07-01", "2026-07-31");
    expect(res).toEqual(["2026-07-23"]);
  });

  it("openShiftRecord", async () => {
    globalFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { id: "1", openedAt: "2026-07-23" } }),
    });
    const res = await openShiftRecord();
    expect(res.id).toBe("1");
  });

  it("fetchShiftRecap", async () => {
    globalFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ total: 100 }] }),
    });
    const res = await fetchShiftRecap();
    expect(res).toEqual([{ total: 100 }]);
  });

  it("fetchSchedule", async () => {
    globalFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ workDate: "2026-07-23" }] }),
    });
    const res = await fetchSchedule("2026-07-01", "2026-07-31");
    expect(res).toEqual([{ workDate: "2026-07-23" }]);
  });

  it("fetchSuppliers", async () => {
    globalFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ id: "1" }] }),
    });
    const res = await fetchSuppliers();
    expect(res).toEqual([{ id: "1" }]);
  });

  it("fetchMenu", async () => {
    globalFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ id: "1", category: "Snack", name: "Test", price: 1000, imageUrl: null }] }),
    });
    const res = await fetchMenu();
    expect(res[0].id).toBe("1");
    expect(res[0].available).toBe(true);
  });

  it("fetchDashboard", async () => {
    globalFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { revenueToday: 100 } }),
    });
    const res = await fetchDashboard();
    expect(res.revenueToday).toBe(100);
  });

  it("fetchTrend", async () => {
    globalFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ day: "Mon" }] }),
    });
    const res = await fetchTrend("daily");
    expect(res).toEqual([{ day: "Mon" }]);
  });

  it("fetchOrders", async () => {
    globalFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ id: "1" }] }),
    });
    const res = await fetchOrders();
    expect(res).toEqual([{ id: "1" }]);
  });
});
