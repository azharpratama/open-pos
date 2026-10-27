import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock localStorage and window in node environment
const storageMap = new Map<string, string>();
const mockLocalStorage = {
  getItem: vi.fn((key: string) => storageMap.get(key) ?? null),
  setItem: vi.fn((key: string, val: string) => { storageMap.set(key, String(val)); }),
  removeItem: vi.fn((key: string) => { storageMap.delete(key); }),
  clear: vi.fn(() => { storageMap.clear(); }),
};

(globalThis as any).localStorage = mockLocalStorage;
(globalThis as any).window = {
  localStorage: mockLocalStorage,
  location: { search: "", hostname: "openpos.vercel.app" },
  fetch: globalThis.fetch,
};
(globalThis as any).document = {
  cookie: "",
};

import {
  isDemoMode,
  enableDemoMode,
  getSandboxData,
  saveSandboxData,
  resetSandboxData,
  handleDemoRequest,
  setupDemoInterceptor,
} from "@/lib/demo-sandbox";

describe("demo-sandbox engine", () => {
  beforeEach(() => {
    storageMap.clear();
    (globalThis as any).window.location.search = "";
    (globalThis as any).window.location.hostname = "localhost";
    resetSandboxData();
  });

  afterEach(() => {
    storageMap.clear();
    vi.restoreAllMocks();
  });

  describe("isDemoMode & enableDemoMode", () => {
    it("returns true when demo flag is set in localStorage", () => {
      enableDemoMode(true);
      expect(isDemoMode()).toBe(true);
      enableDemoMode(false);
      expect(isDemoMode()).toBe(false);
    });

    it("detects vercel.app hostname automatically", () => {
      (globalThis as any).window.location.hostname = "openpos-demo.vercel.app";
      expect(isDemoMode()).toBe(true);
    });

    it("detects ?demo=true URL query parameter", () => {
      (globalThis as any).window.location.search = "?demo=true";
      expect(isDemoMode()).toBe(true);
      (globalThis as any).window.location.search = "?demo=false";
      expect(isDemoMode()).toBe(false);
    });

    it("initializes realistic sandbox data with initial shift and products", () => {
      const data = getSandboxData();
      expect(data.products.length).toBeGreaterThanOrEqual(10);
      expect(data.orders.length).toBeGreaterThanOrEqual(3);
      expect(data.shift.shift_type).toBe("SIANG");
    });
  });

  describe("Auth API in Demo Sandbox", () => {
    it("handles login for kasir and owner", async () => {
      const kasirRes = await handleDemoRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: "kasir@openpos.dev", password: "password123" }),
      });
      expect(kasirRes).not.toBeNull();
      const kasirJson = await kasirRes!.json();
      expect(kasirJson.data.role).toBe("KASIR");

      const ownerRes = await handleDemoRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: "owner@openpos.dev", password: "password123" }),
      });
      const ownerJson = await ownerRes!.json();
      expect(ownerJson.data.role).toBe("OWNER");
    });

    it("handles logout", async () => {
      const res = await handleDemoRequest("/api/auth/logout", { method: "POST" });
      expect(res!.status).toBe(200);
      const json = await res!.json();
      expect(json.success).toBe(true);
    });

    it("handles change-password gracefully", async () => {
      const res = await handleDemoRequest("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword: "p", newPassword: "n" }),
      });
      const json = await res!.json();
      expect(json.success).toBe(true);
    });
  });

  describe("Menu & Menu Items API", () => {
    it("returns active Menu Jual for POS terminal", async () => {
      const res = await handleDemoRequest("/api/menu", { method: "GET" });
      const items = await res!.json();
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThan(0);
      expect(items[0]).toHaveProperty("price");
      expect(items[0]).toHaveProperty("category");
    });

    it("supports menu-items CRUD", async () => {
      // List
      const listRes = await handleDemoRequest("/api/menu-items", { method: "GET" });
      const listJson = await listRes!.json();
      expect(listJson.data.length).toBeGreaterThan(0);

      // Create
      const createRes = await handleDemoRequest("/api/menu-items", {
        method: "POST",
        body: JSON.stringify({
          name: "Caramel Macchiato",
          category: "Kopi",
          price: 26000,
          ingredients: [{ ingredientId: "b-1", quantity: 1 }],
        }),
      });
      expect(createRes!.status).toBe(201);
      const createdJson = await createRes!.json();
      const createdId = createdJson.data.id;

      // Detail
      const detailRes = await handleDemoRequest(`/api/menu-items/${createdId}`, { method: "GET" });
      const detailJson = await detailRes!.json();
      expect(detailJson.data.name).toBe("Caramel Macchiato");

      // Update
      const patchRes = await handleDemoRequest(`/api/menu-items/${createdId}`, {
        method: "PATCH",
        body: JSON.stringify({ price: 28000 }),
      });
      const patchJson = await patchRes!.json();
      expect(patchJson.data.price).toBe(28000);

      // Delete
      const delRes = await handleDemoRequest(`/api/menu-items/${createdId}`, { method: "DELETE" });
      expect(delRes!.status).toBe(200);

      // Upload photo
      const uploadRes = await handleDemoRequest("/api/menu-items/upload", { method: "POST" });
      const uploadJson = await uploadRes!.json();
      expect(uploadJson.data.url).toBe("/logo.svg");
    });
  });

  describe("Orders Lifecycle API", () => {
    it("creates a new order, queries by ref, flips status, adds items, and closes bill", async () => {
      // Create new order
      const createRes = await handleDemoRequest("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          customerName: "Tes Demo",
          cashier: "Kasir Pagi",
          orderType: "DINE_IN",
          tableNumber: "12",
          isOpenBill: true,
          items: [{ name: "Kopi Susu Aren", qty: 2, price: 18000 }],
        }),
      });
      expect(createRes!.status).toBe(201);
      const { data: createData } = await createRes!.json();
      const orderRef = createData.orderRef;
      expect(orderRef).toMatch(/^DEMO-/);

      // Query single order by ref
      const getRes = await handleDemoRequest(`/api/orders/${orderRef}`, { method: "GET" });
      expect(getRes!.status).toBe(200);
      const { data: order } = await getRes!.json();
      expect(order.customerName).toBe("Tes Demo");
      expect(order.subtotal).toBe(36000);
      expect(order.isOpenBill).toBe(true);

      // Add items to open bill
      const addRes = await handleDemoRequest(`/api/orders/${orderRef}/items`, {
        method: "POST",
        body: JSON.stringify({
          items: [{ name: "Kentang Goreng", qty: 1, price: 16000 }],
        }),
      });
      const addJson = await addRes!.json();
      expect(addJson.data.newSubtotal).toBe(52000);
      expect(addJson.data.newTotal).toBe(52000);

      // Close open bill
      const closeRes = await handleDemoRequest(`/api/orders/${orderRef}/close`, {
        method: "POST",
        body: JSON.stringify({
          paymentMethod: "TUNAI",
          amountPaid: 60000,
          changeAmount: 8000,
        }),
      });
      expect(closeRes!.status).toBe(200);

      // Verify closed
      const verifyRes = await handleDemoRequest(`/api/orders/${orderRef}`, { method: "GET" });
      const verifyJson = await verifyRes!.json();
      expect(verifyJson.data.isOpenBill).toBe(false);
      expect(verifyJson.data.paymentStatus).toBe("SUCCESS");

      // Flip status ANTRIAN -> SELESAI
      const patchRes = await handleDemoRequest(`/api/orders/${orderRef}`, {
        method: "PATCH",
        body: JSON.stringify({ orderStatus: "SELESAI" }),
      });
      const patchJson = await patchRes!.json();
      expect(patchJson.data.orderStatus).toBe("SELESAI");
    });

    it("filters orders by status", async () => {
      const res = await handleDemoRequest("/api/orders?status=ANTRIAN", { method: "GET" });
      const json = await res!.json();
      for (const ord of json.data) {
        expect(ord.orderStatus).toBe("ANTRIAN");
      }
    });
  });

  describe("Cancellations API", () => {
    it("creates and approves a cancellation request", async () => {
      // Create request
      const createRes = await handleDemoRequest("/api/cancellations", {
        method: "POST",
        body: JSON.stringify({
          orderId: "DEMO-102",
          requestedBy: "Kasir Pagi",
          reason: "Pelanggan batal menunggu",
        }),
      });
      expect(createRes!.status).toBe(201);
      const { data: req } = await createRes!.json();

      // Approve request
      const patchRes = await handleDemoRequest(`/api/cancellations/${req.id}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "approve" }),
      });
      const patchJson = await patchRes!.json();
      expect(patchJson.data.status).toBe("APPROVED");

      // Verify order status updated to DIBATALKAN
      const ordRes = await handleDemoRequest("/api/orders/DEMO-102", { method: "GET" });
      const ordJson = await ordRes!.json();
      expect(ordJson.data.orderStatus).toBe("DIBATALKAN");
    });
  });

  describe("Reservations API", () => {
    it("creates, updates, and deletes reservation", async () => {
      const createRes = await handleDemoRequest("/api/reservations", {
        method: "POST",
        body: JSON.stringify({
          customerName: "Bpk. Anton",
          customerPhone: "081299998888",
          floorNumber: 2,
          reservationDate: "2026-10-30",
          startTime: "18:00",
          endTime: "20:00",
        }),
      });
      expect(createRes!.status).toBe(201);
      const { data: resv } = await createRes!.json();

      // Update
      const patchRes = await handleDemoRequest(`/api/reservations/${resv.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "CHECKED_IN" }),
      });
      const patchJson = await patchRes!.json();
      expect(patchJson.data.status).toBe("CHECKED_IN");

      // Delete
      const delRes = await handleDemoRequest(`/api/reservations/${resv.id}`, { method: "DELETE" });
      expect(delRes!.status).toBe(200);
    });
  });

  describe("Inventory, Suppliers, Purchases, Expenses", () => {
    it("supports Inventory CRUD", async () => {
      const createRes = await handleDemoRequest("/api/inventory", {
        method: "POST",
        body: JSON.stringify({
          name: "Sirup Karamel",
          unitType: "liter",
          stockQty: 5,
          price: 85000,
        }),
      });
      expect(createRes!.status).toBe(201);
      const { data: inv } = await createRes!.json();

      const patchRes = await handleDemoRequest(`/api/inventory/${inv.id}`, {
        method: "PATCH",
        body: JSON.stringify({ stockQty: 8 }),
      });
      const patchJson = await patchRes!.json();
      expect(patchJson.data.stockQty).toBe(8);

      const delRes = await handleDemoRequest(`/api/inventory/${inv.id}`, { method: "DELETE" });
      expect(delRes!.status).toBe(200);
    });

    it("supports Suppliers CRUD", async () => {
      const createRes = await handleDemoRequest("/api/suppliers", {
        method: "POST",
        body: JSON.stringify({
          name: "Supplier Es Kristal",
          location: "Bogor",
          contact: "0899112233",
        }),
      });
      expect(createRes!.status).toBe(201);
      const { data: sup } = await createRes!.json();

      const patchRes = await handleDemoRequest(`/api/suppliers/${sup.id}`, {
        method: "PATCH",
        body: JSON.stringify({ contact: "0899000000" }),
      });
      const patchJson = await patchRes!.json();
      expect(patchJson.data.contact).toBe("0899000000");

      const delRes = await handleDemoRequest(`/api/suppliers/${sup.id}`, { method: "DELETE" });
      expect(delRes!.status).toBe(200);
    });

    it("records purchases and expenses", async () => {
      const purRes = await handleDemoRequest("/api/purchases", {
        method: "POST",
        body: JSON.stringify({
          supplierId: "sup-1",
          items: [{ name: "Biji Kopi", qty: 2, unitCost: 150000 }],
        }),
      });
      expect(purRes!.status).toBe(201);
      const purJson = await purRes!.json();
      expect(purJson.data.total).toBe(300000);

      const expRes = await handleDemoRequest("/api/expenses", {
        method: "POST",
        body: JSON.stringify({
          note: "Beli bensin antar katering",
          total: 35000,
        }),
      });
      expect(expRes!.status).toBe(201);
    });
  });

  describe("Employees, Salary & Bonuses", () => {
    it("handles employee CRUD and salary recording", async () => {
      const empRes = await handleDemoRequest("/api/employees", {
        method: "POST",
        body: JSON.stringify({
          name: "Barista Magang",
          dailyWage: 60000,
        }),
      });
      expect(empRes!.status).toBe(201);

      const salaryRes = await handleDemoRequest("/api/salary?date=2026-10-29", { method: "GET" });
      const salaryJson = await salaryRes!.json();
      expect(salaryJson.data.total).toBeGreaterThan(0);

      const recRes = await handleDemoRequest("/api/salary", {
        method: "POST",
        body: JSON.stringify({ date: "2026-10-29" }),
      });
      expect(recRes!.status).toBe(200);
    });

    it("handles employee bonuses creation and consumption", async () => {
      const bonRes = await handleDemoRequest("/api/bonuses", {
        method: "POST",
        body: JSON.stringify({
          employeeId: "emp-1",
          productId: "p-1",
          allocated: 10,
        }),
      });
      expect(bonRes!.status).toBe(201);
      const { data: bonus } = await bonRes!.json();

      const consumeRes = await handleDemoRequest("/api/bonuses/consume", {
        method: "POST",
        body: JSON.stringify({ id: bonus.id, qty: 2 }),
      });
      const consumeJson = await consumeRes!.json();
      expect(consumeJson.data.remaining).toBe(8);
    });
  });

  describe("Dashboard, Bookkeeping & Shifts", () => {
    it("returns valid DashboardSummary schema", async () => {
      const res = await handleDemoRequest("/api/dashboard/summary", { method: "GET" });
      const { data } = await res!.json();
      expect(data).toHaveProperty("revenueToday");
      expect(data).toHaveProperty("profitToday");
      expect(data).toHaveProperty("txToday");
      expect(Array.isArray(data.trend)).toBe(true);
    });

    it("returns valid BookkeepingData schema with income statement and running ledger", async () => {
      const res = await handleDemoRequest("/api/bookkeeping", { method: "GET" });
      const { data } = await res!.json();
      expect(data).toHaveProperty("summary");
      expect(data.summary).toHaveProperty("revenueGross");
      expect(data.summary).toHaveProperty("revenueNet");
      expect(data.summary).toHaveProperty("cogs");
      expect(Array.isArray(data.ledger)).toBe(true);
      expect(data.ledger.length).toBeGreaterThan(0);
      expect(data.ledger[0]).toHaveProperty("balance");
    });

    it("returns shift revenue and shift recap", async () => {
      const revRes = await handleDemoRequest("/api/shifts/revenue", { method: "GET" });
      const revJson = await revRes!.json();
      expect(revJson).toHaveProperty("total");
      expect(revJson).toHaveProperty("siang");

      const recapRes = await handleDemoRequest("/api/shifts/recap", { method: "GET" });
      const recapJson = await recapRes!.json();
      expect(Array.isArray(recapJson)).toBe(true);
      expect(recapJson[0]).toHaveProperty("operationalDate");
    });

    it("resets all datasets on clear-datasets", async () => {
      const res = await handleDemoRequest("/api/admin/clear-datasets", { method: "POST" });
      const json = await res!.json();
      expect(json.success).toBe(true);
    });
  });

  describe("setupDemoInterceptor", () => {
    it("installs window.fetch interceptor without throwing", () => {
      expect(() => setupDemoInterceptor()).not.toThrow();
    });
  });
});
