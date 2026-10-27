import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { createEmployee, updateEmployee, deleteEmployee } from "@/lib/employees";
import { createInventory, updateInventory, deleteInventory } from "@/lib/inventory";
import { createMenuItem, updateMenuItem, deleteMenuItem } from "@/lib/menu-admin";
import { setSlot } from "@/lib/shift-schedules";
import { closeShiftRecord } from "@/lib/shifts";
import { createSupplier, updateSupplier, deleteSupplier } from "@/lib/suppliers";
import { recordPurchase } from "@/lib/purchases";
import { recordSalary } from "@/lib/salary";
import { setBonus, removeBonus, consumeBonus } from "@/lib/bonuses";
import { updateOrderStatus } from "@/lib/orders";

describe("API Fetcher mutations (lib/*.ts)", () => {
  let globalFetchMock: any;

  beforeEach(() => {
    globalFetchMock = vi.fn();
    global.fetch = globalFetchMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("createEmployee", async () => {
    globalFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { id: "1" } }),
    });
    const res = await createEmployee({ name: "Budi", bankAccountNo: "", bankName: "", phone: "", shiftCount: 0, dailyWage: 0 });
    expect(res.id).toBe("1");
  });

  it("updateEmployee", async () => {
    globalFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { id: "1", name: "Updated" } }),
    });
    const res = await updateEmployee("1", { name: "Updated", bankAccountNo: "", bankName: "", phone: "", shiftCount: 0, dailyWage: 0 });
    expect(res.name).toBe("Updated");
  });

  it("deleteEmployee", async () => {
    globalFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });
    await expect(deleteEmployee("1")).resolves.toBeUndefined();
  });

  it("createInventory", async () => {
    globalFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { id: "1" } }),
    });
    const res = await createInventory({ name: "Kopi", unitType: "kg", stockQty: 10, price: 1000 });
    expect(res.id).toBe("1");
  });

  it("updateInventory", async () => {
    globalFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { id: "1", name: "Updated" } }),
    });
    const res = await updateInventory("1", { name: "Updated", unitType: "kg", stockQty: 10, price: 1000 });
    expect(res.name).toBe("Updated");
  });

  it("deleteInventory", async () => {
    globalFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });
    await expect(deleteInventory("1")).resolves.toBeUndefined();
  });

  it("createMenuItem", async () => {
    globalFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { id: "1" } }),
    });
    const res = await createMenuItem({ name: "Kopi", category: "Kopi", price: 10000, imageUrl: null, ingredients: [] });
    expect(res.id).toBe("1");
  });

  it("updateMenuItem", async () => {
    globalFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { id: "1", name: "Updated" } }),
    });
    const res = await updateMenuItem("1", { name: "Updated", category: "Kopi", price: 10000, imageUrl: null, ingredients: [] });
    expect(res.name).toBe("Updated");
  });

  it("deleteMenuItem", async () => {
    globalFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });
    await expect(deleteMenuItem("1")).resolves.toBeUndefined();
  });

  it("setSlot", async () => {
    globalFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { workDate: "2026-07-23" } }),
    });
    const res = await setSlot("2026-07-23", "SIANG", []);
    expect(res.workDate).toBe("2026-07-23");
  });

  it("closeShiftRecord", async () => {
    globalFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { revenue: 150000 } }),
    });
    // The server decides the revenue and reports it back.
    await expect(closeShiftRecord()).resolves.toBe(150000);
  });

  it("createSupplier", async () => {
    globalFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { id: "1" } }),
    });
    const res = await createSupplier({ name: "Supplier", location: "", contact: "", notes: "" });
    expect(res.id).toBe("1");
  });

  it("updateSupplier", async () => {
    globalFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { id: "1", name: "Updated" } }),
    });
    const res = await updateSupplier("1", { name: "Updated", location: "", contact: "", notes: "" });
    expect(res.name).toBe("Updated");
  });

  it("deleteSupplier", async () => {
    globalFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });
    await expect(deleteSupplier("1")).resolves.toBeUndefined();
  });

  it("recordPurchase", async () => {
    globalFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { purchaseId: "1", total: 1000 } }),
    });
    const res = await recordPurchase("supplier1", "note", []);
    expect(res.purchaseId).toBe("1");
  });

  it("recordSalary", async () => {
    globalFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { total: 100000 } }),
    });
    const res = await recordSalary("2026-07-23");
    expect(res.total).toBe(100000);
  });

  it("setBonus", async () => {
    globalFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });
    await expect(setBonus("emp1", "prod1", 10)).resolves.toBeUndefined();
  });

  it("removeBonus", async () => {
    globalFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });
    await expect(removeBonus("1")).resolves.toBeUndefined();
  });

  it("consumeBonus", async () => {
    globalFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { remaining: 5, stock: 10 } }),
    });
    await expect(consumeBonus("123", 1)).resolves.toEqual({ remaining: 5, stock: 10 });
  });

  it("updateOrderStatus", async () => {
    globalFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });
    await expect(updateOrderStatus("123", "SELESAI")).resolves.toBeUndefined();
  });
});
