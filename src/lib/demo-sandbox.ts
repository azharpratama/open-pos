"use client";

/**
 * OpenPOS In-Browser Sandbox (Demo Mode - Option A)
 * Provides 100% client-isolated, ephemeral data storage using localStorage.
 * Multiple visitors can test POS, ERP, and Bookkeeping without database conflicts or cloud dependencies.
 */

const STORAGE_KEY = "openpos_demo_sandbox_v1";
const DEMO_FLAG_KEY = "openpos_demo_active";

export function isDemoMode(): boolean {
  if (typeof window === "undefined") {
    return (
      process.env.NEXT_PUBLIC_DEMO_MODE === "true" ||
      process.env.DEMO_MODE === "true" ||
      !process.env.DATABASE_URL
    );
  }
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("demo") === "true") {
    window.localStorage.setItem(DEMO_FLAG_KEY, "true");
    return true;
  }
  if (urlParams.get("demo") === "false") {
    window.localStorage.removeItem(DEMO_FLAG_KEY);
    return false;
  }
  return (
    process.env.NEXT_PUBLIC_DEMO_MODE === "true" ||
    window.localStorage.getItem(DEMO_FLAG_KEY) === "true" ||
    window.location.hostname.includes("vercel.app")
  );
}

export function enableDemoMode(enable = true) {
  if (typeof window === "undefined") return;
  if (enable) {
    window.localStorage.setItem(DEMO_FLAG_KEY, "true");
  } else {
    window.localStorage.removeItem(DEMO_FLAG_KEY);
  }
}

// Initial realistic seed data for the sandbox
export function createInitialSandboxData() {
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();

  return {
    version: 1,
    shift: {
      id: "demo-shift-1",
      shift_type: "SIANG",
      cashier_name: "Kasir Pagi",
      opened_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
      initial_cash: 200000,
    },
    products: [
      // Menu Jual
      { id: "p-1", name: "Kopi Susu Aren", category: "Kopi", price: 18000, category_type: "Menu Jual", is_active: true, unit_type: "pcs", stock_qty: 150, image_url: null },
      { id: "p-2", name: "Americano", category: "Kopi", price: 15000, category_type: "Menu Jual", is_active: true, unit_type: "pcs", stock_qty: 200, image_url: null },
      { id: "p-3", name: "Cappuccino", category: "Kopi", price: 22000, category_type: "Menu Jual", is_active: true, unit_type: "pcs", stock_qty: 120, image_url: null },
      { id: "p-4", name: "Matcha Latte", category: "Non-Kopi", price: 24000, category_type: "Menu Jual", is_active: true, unit_type: "pcs", stock_qty: 85, image_url: null },
      { id: "p-5", name: "Lemon Tea", category: "Non-Kopi", price: 12000, category_type: "Menu Jual", is_active: true, unit_type: "pcs", stock_qty: 140, image_url: null },
      { id: "p-6", name: "Coklat Panas", category: "Non-Kopi", price: 18000, category_type: "Menu Jual", is_active: true, unit_type: "pcs", stock_qty: 90, image_url: null },
      { id: "p-7", name: "Nasi Goreng Spesial", category: "Makanan", price: 28000, category_type: "Menu Jual", is_active: true, unit_type: "pcs", stock_qty: 60, image_url: null },
      { id: "p-8", name: "Mie Goreng Jawa", category: "Makanan", price: 25000, category_type: "Menu Jual", is_active: true, unit_type: "pcs", stock_qty: 55, image_url: null },
      { id: "p-9", name: "Kentang Goreng", category: "Camilan", price: 16000, category_type: "Menu Jual", is_active: true, unit_type: "pcs", stock_qty: 75, image_url: null },
      { id: "p-10", name: "Roti Bakar Coklat Keju", category: "Camilan", price: 20000, category_type: "Menu Jual", is_active: true, unit_type: "pcs", stock_qty: 45, image_url: null },
      // Bahan Baku
      { id: "b-1", name: "Biji Kopi Arabika", category: "Bahan Kopi", price: 140000 as number | null, category_type: "Bahan Baku", is_active: true, unit_type: "kg", stock_qty: 18.5, image_url: null },
      { id: "b-2", name: "Susu Fresh Milk", category: "Dairy", price: 19500, category_type: "Bahan Baku", is_active: true, unit_type: "liter", stock_qty: 32, image_url: null },
      { id: "b-3", name: "Gula Aren Cair", category: "Pemanis", price: 28000, category_type: "Bahan Baku", is_active: true, unit_type: "liter", stock_qty: 12, image_url: null },
      { id: "b-4", name: "Bubuk Matcha Premium", category: "Non-Kopi", price: 175000, category_type: "Bahan Baku", is_active: true, unit_type: "kg", stock_qty: 4.2, image_url: null },
      { id: "b-5", name: "Cup Plastik 16oz + Tutup", category: "Kemasan", price: 450, category_type: "Bahan Baku", is_active: true, unit_type: "pcs", stock_qty: 450, image_url: null },
    ],

    orders: [
      {
        id: "demo-ord-1",
        order_ref: "DEMO-102",
        customer_name: "Budi Santoso",
        cashier_name: "Kasir Pagi",
        order_type: "DINE_IN",
        table_number: "04",
        order_status: "ANTRIAN",
        payment_method: "QRIS",
        payment_status: "SUCCESS",
        subtotal: 58000,
        discount: 0,
        total_amount: 58000,
        amount_paid: 58000,
        change_amount: 0,
        is_open_bill: false,
        reservation_id: null,
        created_at: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
        items: [
          { id: "item-1", name: "Kopi Susu Aren", qty: 2, price: 18000, subtotal: 36000 },
          { id: "item-2", name: "Cappuccino", qty: 1, price: 22000, subtotal: 22000 },
        ],
      },
      {
        id: "demo-ord-2",
        order_ref: "DEMO-101",
        customer_name: "Meja 07 (Pak Hendra)",
        cashier_name: "Kasir Pagi",
        order_type: "DINE_IN",
        table_number: "07",
        order_status: "ANTRIAN",
        payment_method: "TUNAI",
        payment_status: "PENDING",
        subtotal: 86000,
        discount: 0,
        total_amount: 86000,
        amount_paid: 0,
        change_amount: 0,
        is_open_bill: true,
        reservation_id: null,
        created_at: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
        items: [
          { id: "item-3", name: "Americano", qty: 2, price: 15000, subtotal: 30000 },
          { id: "item-4", name: "Nasi Goreng Spesial", qty: 2, price: 28000, subtotal: 56000 },
        ],
      },
      {
        id: "demo-ord-3",
        order_ref: "DEMO-100",
        customer_name: "Siti Rahma",
        cashier_name: "Kasir Pagi",
        order_type: "TAKEAWAY",
        table_number: null,
        order_status: "SELESAI",
        payment_method: "TUNAI",
        payment_status: "SUCCESS",
        subtotal: 42000,
        discount: 0,
        total_amount: 42000,
        amount_paid: 50000,
        change_amount: 8000,
        is_open_bill: false,
        reservation_id: null,
        created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        items: [
          { id: "item-5", name: "Matcha Latte", qty: 1, price: 24000, subtotal: 24000 },
          { id: "item-6", name: "Coklat Panas", qty: 1, price: 18000, subtotal: 18000 },
        ],
      },
    ],

    cancellations: [
      {
        id: "can-1",
        orderId: "demo-ord-3",
        orderRef: "DEMO-100",
        customerName: "Siti Rahma",
        orderTotal: 42000,
        requestedBy: "Kasir Pagi",
        reason: "Pelanggan salah pesan item rasa coklat",
        status: "APPROVED",
        reviewedAt: now,
        createdAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
      },
    ],

    reservations: [
      {
        id: "demo-res-1",
        customerName: "Rina Wijaya",
        customerPhone: "081234567890",
        floorNumber: 2,
        reservationDate: today,
        startTime: "19:00",
        endTime: "21:00",
        minimumSpend: 250000,
        depositAmount: 100000,
        depositMethod: "TRANSFER",
        status: "CONFIRMED",
        notes: "Ulang tahun keluarga (bawa kue)",
        createdAt: now,
      },
    ],

    employees: [
      { id: "emp-1", name: "Kasir Pagi", bankAccountNo: "123456789", bankName: "BCA", phone: "08120000001", shiftCount: 22, dailyWage: 75000 },
      { id: "emp-2", name: "Kasir Sore", bankAccountNo: "987654321", bankName: "Mandiri", phone: "08120000002", shiftCount: 18, dailyWage: 75000 },
      { id: "emp-3", name: "Barista Utama", bankAccountNo: "555666777", bankName: "BRI", phone: "08120000003", shiftCount: 24, dailyWage: 85000 },
    ],

    suppliers: [
      { id: "sup-1", name: "Distributor Biji Kopi", location: "Bandung", contact: "0811223344", notes: "Pengiriman tiap Senin & Kamis" },
      { id: "sup-2", name: "Supplier Kemasan & Cup", location: "Jakarta Barat", contact: "0811998877", notes: "Min pemesanan 5 dus" },
    ],

    purchases: [
      {
        id: "pur-1",
        supplierId: "sup-1",
        supplierName: "Distributor Biji Kopi",
        purchaseDate: today,
        total: 600000,
        note: "Beli biji kopi arabika 4kg",
        kind: "bahan",
        itemCount: 1,
        items: [{ name: "Biji Kopi Arabika", qty: 4, unitCost: 150000, subtotal: 600000 }],
      },
    ],

    expenses: [
      { id: "exp-1", purchaseDate: today, supplierName: null, note: "Beli Es Batu Kristal 3 Bal", total: 45000, kind: "beban_lain" },
      { id: "exp-2", purchaseDate: today, supplierName: null, note: "Sabun Cuci Piring & Spons", total: 25000, kind: "beban_lain" },
    ],

    bonuses: [
      {
        id: "bon-1",
        employeeId: "emp-1",
        employeeName: "Kasir Pagi",
        productId: "p-1",
        productName: "Kopi Susu Aren",
        unitType: "pcs",
        allocated: 5,
        remaining: 3,
      },
    ],

    shiftSchedules: [
      { workDate: today, shiftType: "SIANG", employeeIds: ["emp-1", "emp-3"] },
      { workDate: today, shiftType: "MALAM", employeeIds: ["emp-2"] },
    ],

    recordedSalaries: [today],

    appSettings: {
      reservation_minimum_spend: { amount: 200000 },
      business_name: { value: "OpenPOS Specialty Coffee" },
    },
  };
}

export function getSandboxData(): ReturnType<typeof createInitialSandboxData> {
  if (typeof window === "undefined") return createInitialSandboxData();
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const initial = createInitialSandboxData();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
  try {
    return JSON.parse(raw);
  } catch {
    const initial = createInitialSandboxData();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
}

export function saveSandboxData(data: ReturnType<typeof createInitialSandboxData>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function resetSandboxData() {
  if (typeof window === "undefined") return createInitialSandboxData();
  const initial = createInitialSandboxData();
  saveSandboxData(initial);
  return initial;
}


function base64UrlEncode(str: string): string {
  if (typeof btoa !== "undefined") {
    return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  return Buffer.from(str).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function createBrowserDemoToken(role: "OWNER" | "KASIR"): Promise<string> {
  const enc = new TextEncoder();
  const secret = "openpos-default-production-secret-key-32-chars-long";
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7;
  const isOwner = role === "OWNER";
  const user = {
    id: isOwner ? "demo-owner-id" : "demo-kasir-id",
    email: isOwner ? "owner@openpos.dev" : "kasir@openpos.dev",
    role,
    name: isOwner ? "Owner OpenPOS" : "Kasir OpenPOS",
    exp,
  };
  const payload = base64UrlEncode(JSON.stringify(user));
  const data = enc.encode(`${header}.${payload}`);

  try {
    const cryptoSubtle = typeof window !== "undefined" ? window.crypto?.subtle : (globalThis as any).crypto?.subtle;
    if (cryptoSubtle) {
      const key = await cryptoSubtle.importKey(
        "raw",
        enc.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      const sig = await cryptoSubtle.sign("HMAC", key, data);
      const sigBytes = new Uint8Array(sig);
      let binary = "";
      for (let i = 0; i < sigBytes.length; i++) {
        binary += String.fromCharCode(sigBytes[i]);
      }
      const sigB64 = base64UrlEncode(binary);
      return `${header}.${payload}.${sigB64}`;
    }
  } catch (err) {
    console.warn("Failed to generate dynamic WebCrypto token, falling back to static token:", err);
  }

  // Pre-calculated signatures for "openpos-default-production-secret-key-32-chars-long" valid until 2026/2027
  if (role === "OWNER") {
    return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImRlbW8tb3duZXItaWQiLCJlbWFpbCI6Im93bmVyQG9wZW5wb3MuZGV2Iiwicm9sZSI6Ik9XTkVSIiwibmFtZSI6Ik93bmVyIE9wZW5QT1MiLCJleHAiOjE3OTU4NDAzNTd9.HwDRCMkZoG4YX3IzTGVjcPg8G-C96aC9jD53WKd6S1Y";
  }
  return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImRlbW8ta2FzaXItaWQiLCJlbWFpbCI6Imthc2lyQG9wZW5wb3MuZGV2Iiwicm9sZSI6IktBU0lSIiwibmFtZSI6Ikthc2lyIE9wZW5QT1MiLCJleHAiOjE3OTU4NDAzNTd9.OlDfYaxsp7K2v2RzFs4UTUOHxWmipUQ4d-LqP2RsnaY";
}

// Router interceptor for mock endpoints
export async function handleDemoRequest(
  urlStr: string,
  options?: RequestInit
): Promise<Response | null> {
  const url = new URL(urlStr, "http://localhost");
  const path = url.pathname;
  const method = options?.method?.toUpperCase() || "GET";
  const data = getSandboxData();
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();

  const jsonOk = (payload: any, status = 200) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json" },
    });

  const jsonErr = (message: string, status = 400) =>
    new Response(JSON.stringify({ error: message }), {
      status,
      headers: { "Content-Type": "application/json" },
    });

  // Auth: Login
  if (path === "/api/auth/login" && method === "POST") {
    const body = options?.body ? JSON.parse(options.body as string) : {};
    const email = (body.email || "").toLowerCase().trim();
    const isOwner = email.includes("owner");
    const role: "OWNER" | "KASIR" = isOwner ? "OWNER" : "KASIR";
    const name = isOwner ? "Owner OpenPOS" : "Kasir OpenPOS";

    const token = await createBrowserDemoToken(role);

    if (typeof document !== "undefined") {
      document.cookie = `openpos_session=${token}; path=/; max-age=604800; SameSite=Lax`;
    }

    return jsonOk({
      data: {
        role,
        name,
        token,
      },
    });
  }

  // Auth: Logout
  if (path === "/api/auth/logout" && method === "POST") {
    if (typeof document !== "undefined") {
      document.cookie = "openpos_session=; path=/; max-age=0";
    }
    return jsonOk({ success: true });
  }

  // Auth: Change passwords
  if ((path === "/api/auth/change-password" || path === "/api/auth/change-kasir-password") && method === "POST") {
    return jsonOk({ success: true, message: "Password berhasil diperbarui (Sandbox Mode)" });
  }

  // Menu: GET (For Kasir POS Terminal)
  if (path === "/api/menu" && method === "GET") {
    const menuItems = data.products
      .filter((p) => p.category_type === "Menu Jual" && p.is_active)
      .map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        category: p.category,
        stock: p.stock_qty,
        is_active: p.is_active,
        image_url: p.image_url,
      }));
    return jsonOk(menuItems);
  }

  // Menu Items (Admin CRUD)
  if (path === "/api/menu-items") {
    if (method === "GET") {
      const items = data.products
        .filter((p) => p.category_type === "Menu Jual")
        .map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          price: p.price,
          imageUrl: p.image_url,
          ingredientCount: 2,
        }));
      return jsonOk({ data: items });
    }
    if (method === "POST") {
      const body = options?.body ? JSON.parse(options.body as string) : {};
      const newItem = {
        id: `p-${Date.now()}`,
        name: body.name,
        category: body.category || "Menu Jual",
        price: Number(body.price || 0),
        category_type: "Menu Jual",
        is_active: true,
        unit_type: "pcs",
        stock_qty: 100,
        image_url: body.imageUrl || null,
      };
      data.products.push(newItem);
      saveSandboxData(data);
      return jsonOk({ data: { ...newItem, ingredientCount: body.ingredients?.length || 0 } }, 201);
    }
  }

  // Single Menu Item (Detail, Update, Delete)
  if (path.startsWith("/api/menu-items/") && !path.includes("/upload")) {
    const id = decodeURIComponent(path.replace("/api/menu-items/", ""));
    const prod = data.products.find((p) => p.id === id);
    if (!prod) return jsonErr("Menu tidak ditemukan", 404);

    if (method === "GET") {
      return jsonOk({
        data: {
          id: prod.id,
          name: prod.name,
          category: prod.category,
          price: prod.price,
          imageUrl: prod.image_url,
          ingredients: [
            { ingredientId: "b-1", ingredientName: "Biji Kopi Arabika", unitType: "kg", quantity: 0.015 },
          ],
        },
      });
    }

    if (method === "PATCH") {
      const body = options?.body ? JSON.parse(options.body as string) : {};
      if (body.name) prod.name = body.name;
      if (body.category) prod.category = body.category;
      if (body.price !== undefined) prod.price = Number(body.price);
      if (body.imageUrl !== undefined) prod.image_url = body.imageUrl;
      saveSandboxData(data);
      return jsonOk({ data: { ...prod, imageUrl: prod.image_url, ingredientCount: 1 } });
    }

    if (method === "DELETE") {
      data.products = data.products.filter((p) => p.id !== id);
      saveSandboxData(data);
      return jsonOk({ success: true });
    }
  }

  // Upload Photo Mock
  if (path === "/api/menu-items/upload" && method === "POST") {
    return jsonOk({ data: { url: "/logo.svg" } });
  }

  // Orders: GET List
  if (path === "/api/orders" && method === "GET") {
    const statusParam = url.searchParams.get("status");
    let filtered = data.orders;
    if (statusParam) {
      const statuses = statusParam.split(",").map((s) => s.trim().toUpperCase());
      filtered = filtered.filter((o) => statuses.includes(o.order_status));
    }
    const formatted = filtered.map((o) => ({
      id: o.order_ref,
      dbId: o.id,
      createdAt: o.created_at,
      cashier: o.cashier_name,
      customerName: o.customer_name,
      orderType: o.order_type,
      tableNumber: o.table_number,
      orderStatus: o.order_status,
      paymentMethod: o.payment_method || "TUNAI",
      paymentStatus: o.payment_status,
      subtotal: o.subtotal,
      discount: o.discount || 0,
      total: o.total_amount,
      isOpenBill: Boolean(o.is_open_bill),
      reservationId: o.reservation_id,
      items: o.items,
    }));
    return jsonOk({ data: formatted });
  }

  // Orders: POST (Create Order)
  if (path === "/api/orders" && method === "POST") {
    const body = options?.body ? JSON.parse(options.body as string) : {};
    const refNum = 100 + data.orders.length + 1;
    const orderRef = `DEMO-${refNum}`;
    const items = body.items || [];
    const subtotal = items.reduce((acc: number, it: any) => acc + (it.price || 0) * (it.qty || 1), 0);
    const discount = Number(body.discount || 0);
    const total = Math.max(0, subtotal - discount);

    const newOrder = {
      id: `demo-ord-${Date.now()}`,
      order_ref: orderRef,
      customer_name: body.customerName || "Pelanggan",
      cashier_name: body.cashier || "Kasir Pagi",
      order_type: body.orderType || "DINE_IN",
      table_number: body.tableNumber || null,
      order_status: "ANTRIAN",
      payment_method: body.paymentMethod || "TUNAI",
      payment_status: body.isOpenBill ? "PENDING" : "SUCCESS",
      subtotal,
      discount,
      total_amount: total,
      amount_paid: body.amountPaid || total,
      change_amount: body.changeAmount || 0,
      is_open_bill: Boolean(body.isOpenBill),
      reservation_id: body.reservationId || null,
      created_at: new Date().toISOString(),
      items: items.map((it: any, idx: number) => ({
        id: `item-${Date.now()}-${idx}`,
        name: it.name,
        qty: it.qty,
        price: it.price,
        subtotal: it.price * it.qty,
        modifier: it.modifier || undefined,
      })),
    };

    data.orders.unshift(newOrder);
    saveSandboxData(data);
    return jsonOk({ data: { orderRef, id: newOrder.id } }, 201);
  }

  // Single Order: GET /api/orders/[ref]
  if (path.startsWith("/api/orders/") && !path.includes("/close") && !path.includes("/items") && method === "GET") {
    const ref = decodeURIComponent(path.replace("/api/orders/", ""));
    const o = data.orders.find((ord) => ord.order_ref === ref);
    if (!o) return jsonErr("Pesanan tidak ditemukan", 404);
    return jsonOk({
      data: {
        id: o.order_ref,
        dbId: o.id,
        createdAt: o.created_at,
        cashier: o.cashier_name,
        customerName: o.customer_name,
        orderType: o.order_type,
        tableNumber: o.table_number,
        orderStatus: o.order_status,
        paymentMethod: o.payment_method || "TUNAI",
        paymentStatus: o.payment_status,
        subtotal: o.subtotal,
        discount: o.discount || 0,
        total: o.total_amount,
        isOpenBill: Boolean(o.is_open_bill),
        reservationId: o.reservation_id,
        items: o.items,
      },
    });
  }

  // Orders: PATCH /api/orders/[ref] (Flip status ANTRIAN <-> SELESAI)
  if (path.startsWith("/api/orders/") && !path.includes("/close") && !path.includes("/items") && method === "PATCH") {
    const ref = decodeURIComponent(path.replace("/api/orders/", ""));
    const body = options?.body ? JSON.parse(options.body as string) : {};
    const order = data.orders.find((o) => o.order_ref === ref);
    if (!order) return jsonErr("Pesanan tidak ditemukan", 404);

    if (body.orderStatus) order.order_status = body.orderStatus;
    if (body.paymentStatus) order.payment_status = body.paymentStatus;
    saveSandboxData(data);
    return jsonOk({ data: { orderRef: order.order_ref, orderStatus: order.order_status } });
  }

  // Orders: POST /api/orders/[ref]/items (Add items to open bill)
  if (path.includes("/items") && method === "POST") {
    const ref = decodeURIComponent(path.replace("/api/orders/", "").replace("/items", ""));
    const body = options?.body ? JSON.parse(options.body as string) : {};
    const order = data.orders.find((o) => o.order_ref === ref);
    if (!order) return jsonErr("Pesanan tidak ditemukan", 404);

    const newItems = (body.items || []).map((it: any, idx: number) => ({
      id: `item-${Date.now()}-${idx}`,
      name: it.name,
      qty: it.qty,
      price: it.price,
      subtotal: it.price * it.qty,
      modifier: it.modifier || undefined,
    }));

    order.items.push(...newItems);
    order.subtotal = order.items.reduce((acc, it) => acc + it.subtotal, 0);
    order.total_amount = Math.max(0, order.subtotal - (order.discount || 0));
    saveSandboxData(data);

    return jsonOk({ data: { newSubtotal: order.subtotal, newTotal: order.total_amount } });
  }

  // Orders: POST /api/orders/[ref]/close (Final settlement)
  if (path.includes("/close") && method === "POST") {
    const ref = decodeURIComponent(path.replace("/api/orders/", "").replace("/close", ""));
    const body = options?.body ? JSON.parse(options.body as string) : {};
    const order = data.orders.find((o) => o.order_ref === ref);
    if (!order) return jsonErr("Pesanan tidak ditemukan", 404);

    order.is_open_bill = false;
    order.payment_status = "SUCCESS";
    order.payment_method = body.paymentMethod || "TUNAI";
    if (body.discount !== undefined) {
      order.discount = Number(body.discount);
      order.total_amount = Math.max(0, order.subtotal - order.discount);
    }
    order.amount_paid = body.amountPaid || order.total_amount;
    order.change_amount = body.changeAmount || 0;
    saveSandboxData(data);
    return jsonOk({ data: order });
  }

  // Cancellations: GET & POST
  if (path === "/api/cancellations") {
    if (method === "GET") {
      const status = url.searchParams.get("status");
      let res = data.cancellations;
      if (status) {
        res = res.filter((c) => c.status === status);
      }
      return jsonOk({ data: res });
    }
    if (method === "POST") {
      const body = options?.body ? JSON.parse(options.body as string) : {};
      const order = data.orders.find((o) => o.id === body.orderId || o.order_ref === body.orderId);
      const newCancel = {
        id: `can-${Date.now()}`,
        orderId: order?.id || body.orderId,
        orderRef: order?.order_ref || "DEMO-ORD",
        customerName: order?.customer_name || "Pelanggan",
        orderTotal: order?.total_amount || 0,
        requestedBy: body.requestedBy || "Kasir",
        reason: body.reason || "Pembatalan",
        status: "PENDING",
        createdAt: now,
      };
      data.cancellations.unshift(newCancel as any);
      saveSandboxData(data);
      return jsonOk({ data: newCancel }, 201);
    }
  }

  // Cancellations: PATCH /api/cancellations/[id]
  if (path.startsWith("/api/cancellations/") && method === "PATCH") {
    const id = decodeURIComponent(path.replace("/api/cancellations/", ""));
    const body = options?.body ? JSON.parse(options.body as string) : {};
    const req = data.cancellations.find((c) => c.id === id);
    if (!req) return jsonErr("Permintaan pembatalan tidak ditemukan", 404);

    req.status = body.action === "approve" ? "APPROVED" : "REJECTED";
    req.reviewedAt = now;
    if (body.action === "approve") {
      const ord = data.orders.find((o) => o.id === req.orderId || o.order_ref === req.orderRef);
      if (ord) ord.order_status = "DIBATALKAN";
    }
    saveSandboxData(data);
    return jsonOk({ success: true, data: req });
  }

  // Cashiers Roster: GET
  if (path === "/api/cashiers" && method === "GET") {
    return jsonOk({
      date: today,
      data: [
        { id: "emp-1", name: "Kasir Pagi" },
        { id: "emp-2", name: "Kasir Sore" },
      ],
    });
  }

  // Current Shift: GET
  if (path === "/api/current-shift" && method === "GET") {
    return jsonOk({
      data: {
        id: data.shift.id,
        shift_type: data.shift.shift_type,
        cashier_name: data.shift.cashier_name,
        opened_at: data.shift.opened_at,
        initial_cash: data.shift.initial_cash,
      },
    });
  }

  // Shifts: POST (Open shift) & PATCH (Close shift)
  if (path === "/api/shifts") {
    if (method === "POST") {
      data.shift.opened_at = now;
      saveSandboxData(data);
      return jsonOk({ id: data.shift.id, openedAt: now });
    }
    if (method === "PATCH") {
      return jsonOk({ revenue: 770000 });
    }
  }

  // Shifts: GET /api/shifts/revenue
  if (path === "/api/shifts/revenue" && method === "GET") {
    const paidOrders = data.orders.filter((o) => o.payment_status === "SUCCESS");
    const total = paidOrders.reduce((acc, o) => acc + o.total_amount, 0);
    const cash = paidOrders.filter((o) => o.payment_method === "TUNAI").reduce((acc, o) => acc + o.total_amount, 0);
    const qris = paidOrders.filter((o) => o.payment_method === "QRIS").reduce((acc, o) => acc + o.total_amount, 0);
    const transfer = paidOrders.filter((o) => o.payment_method === "TRANSFER").reduce((acc, o) => acc + o.total_amount, 0);
    return jsonOk({
      operationalDate: today,
      total,
      siang: Math.round(total * 0.65),
      malam: Math.round(total * 0.35),
      luar: 0,
      cash,
      qris,
      transfer,
    });
  }

  // Shifts: GET /api/shifts/recap
  if (path === "/api/shifts/recap" && method === "GET") {
    const paidOrders = data.orders.filter((o) => o.payment_status === "SUCCESS");
    const total = paidOrders.reduce((acc, o) => acc + o.total_amount, 0);
    return jsonOk([
      {
        operationalDate: today,
        siang: Math.round(total * 0.65),
        malam: Math.round(total * 0.35),
        luar: 0,
        total,
        siangRunning: true,
        malamRunning: false,
        siangNames: ["Kasir Pagi"],
        malamNames: ["Kasir Sore"],
      },
    ]);
  }

  // Shift Schedules: GET & POST
  if (path === "/api/shift-schedules") {
    if (method === "GET") {
      return jsonOk({ data: data.shiftSchedules });
    }
    if (method === "POST") {
      const body = options?.body ? JSON.parse(options.body as string) : {};
      const slot = {
        workDate: body.workDate || today,
        shiftType: body.shiftType || "SIANG",
        employeeIds: body.employeeIds || [],
      };
      data.shiftSchedules = data.shiftSchedules.filter(
        (s) => !(s.workDate === slot.workDate && s.shiftType === slot.shiftType)
      );
      data.shiftSchedules.push(slot);
      saveSandboxData(data);
      return jsonOk({ data: slot });
    }
  }

  // Reservations: GET & POST
  if (path === "/api/reservations") {
    if (method === "GET") {
      return jsonOk({ data: data.reservations });
    }
    if (method === "POST") {
      const body = options?.body ? JSON.parse(options.body as string) : {};
      const newRes = {
        id: `demo-res-${Date.now()}`,
        customerName: body.customerName,
        customerPhone: body.customerPhone || undefined,
        floorNumber: body.floorNumber || 2,
        reservationDate: body.reservationDate,
        startTime: body.startTime,
        endTime: body.endTime,
        minimumSpend: body.minimumSpend || 200000,
        depositAmount: body.depositAmount || 0,
        depositMethod: body.depositMethod || "TRANSFER",
        status: "CONFIRMED",
        notes: body.notes || undefined,
        createdAt: now,
      };
      data.reservations.unshift(newRes as any);
      saveSandboxData(data);
      return jsonOk({ data: newRes }, 201);
    }
  }

  // Single Reservation: GET & PATCH & DELETE
  if (path.startsWith("/api/reservations/")) {
    const id = decodeURIComponent(path.replace("/api/reservations/", ""));
    const res = data.reservations.find((r) => r.id === id);
    if (!res) return jsonErr("Reservasi tidak ditemukan", 404);

    if (method === "GET") {
      return jsonOk({ data: res });
    }
    if (method === "PATCH") {
      const body = options?.body ? JSON.parse(options.body as string) : {};
      if (body.status) res.status = body.status;
      if (body.depositAmount !== undefined) res.depositAmount = body.depositAmount;
      if (body.depositMethod !== undefined) res.depositMethod = body.depositMethod;
      saveSandboxData(data);
      return jsonOk({ data: res });
    }
    if (method === "DELETE") {
      data.reservations = data.reservations.filter((r) => r.id !== id);
      saveSandboxData(data);
      return jsonOk({ success: true });
    }
  }

  // Dashboard Summary: GET (Exact DashboardSummary Schema)
  if (path === "/api/dashboard/summary" && method === "GET") {
    const paidOrders = data.orders.filter((o) => o.payment_status === "SUCCESS");
    const revenueToday = paidOrders.reduce((acc, o) => acc + o.total_amount, 0);
    const expenseToday = data.expenses.reduce((acc, e) => acc + e.total, 0);

    const points = [];
    const nowTs = Date.now();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(nowTs - i * 86400000).toISOString().slice(0, 10);
      points.push({ day: d, revenue: 850000 + ((i * 123456) % 650000) });
    }

    return jsonOk({
      data: {
        revenueToday,
        revenueWeek: revenueToday * 6 + 1200000,
        revenueMonth: revenueToday * 24 + 4500000,
        expenseToday,
        expenseWeek: expenseToday * 5 + 400000,
        expenseMonth: expenseToday * 20 + 2000000,
        profitToday: revenueToday - expenseToday,
        profitWeek: revenueToday * 6 - expenseToday * 5,
        profitMonth: revenueToday * 24 - expenseToday * 20,
        txToday: paidOrders.length,
        trend: points,
      },
    });
  }

  // Dashboard Trend: GET
  if (path === "/api/dashboard/trend" && method === "GET") {
    const points = [];
    const metric = url.searchParams.get("metric") || "revenue";
    const nowTs = Date.now();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(nowTs - i * 86400000).toISOString().slice(0, 10);
      const val = metric === "revenue" ? 1200000 + ((i * 70000) % 500000) : 400000 + ((i * 30000) % 200000);
      points.push({ bucket: d, value: val });
    }
    return jsonOk({ data: points });
  }

  // Bookkeeping: GET (Exact BookkeepingData Schema)
  if (path === "/api/bookkeeping" && method === "GET") {
    const paidOrders = data.orders.filter((o) => o.payment_status === "SUCCESS");
    const revenueNet = paidOrders.reduce((acc, o) => acc + o.total_amount, 0);
    const revenueGross = paidOrders.reduce((acc, o) => acc + o.subtotal, 0);
    const discountTotal = paidOrders.reduce((acc, o) => acc + (o.discount || 0), 0);

    const revenueTunai = paidOrders.filter((o) => o.payment_method === "TUNAI").reduce((acc, o) => acc + o.total_amount, 0);
    const revenueQris = paidOrders.filter((o) => o.payment_method === "QRIS").reduce((acc, o) => acc + o.total_amount, 0);
    const revenueTransfer = paidOrders.filter((o) => o.payment_method === "TRANSFER").reduce((acc, o) => acc + o.total_amount, 0);

    const cogs = data.purchases.reduce((acc, p) => acc + p.total, 0);
    const otherExpense = data.expenses.reduce((acc, e) => acc + e.total, 0);
    const salary = data.employees.reduce((acc, emp) => acc + emp.dailyWage, 0);

    let runningBalance = 1500000;
    const ledger = [
      {
        date: today,
        ref: "SALDO-AWAL",
        description: "Saldo Kas Operasional Awal Hari",
        category: "Kas Awal",
        cashIn: 1500000,
        cashOut: 0,
        balance: 1500000,
      },
    ];

    for (const ord of paidOrders) {
      runningBalance += ord.total_amount;
      ledger.push({
        date: ord.created_at.slice(0, 10),
        ref: ord.order_ref,
        description: `Penjualan ${ord.customer_name} (${ord.payment_method})`,
        category: "Penjualan",
        cashIn: ord.total_amount,
        cashOut: 0,
        balance: runningBalance,
      });
    }

    for (const exp of data.expenses) {
      runningBalance -= exp.total;
      ledger.push({
        date: exp.purchaseDate,
        ref: exp.id,
        description: exp.note || "Beban Operasional",
        category: "Pengeluaran",
        cashIn: 0,
        cashOut: exp.total,
        balance: runningBalance,
      });
    }

    return jsonOk({
      data: {
        start: url.searchParams.get("start") || today,
        end: url.searchParams.get("end") || today,
        summary: {
          revenueGross,
          discountTotal,
          revenueNet,
          revenueTunai,
          revenueQris,
          revenueTransfer,
          txCount: paidOrders.length,
          cogs,
          salary,
          otherExpense,
        },
        ledger,
      },
    });
  }

  // Employees CRUD
  if (path === "/api/employees") {
    if (method === "GET") {
      return jsonOk({ data: data.employees });
    }
    if (method === "POST") {
      const body = options?.body ? JSON.parse(options.body as string) : {};
      const newEmp = {
        id: `emp-${Date.now()}`,
        name: body.name,
        bankAccountNo: body.bankAccountNo || null,
        bankName: body.bankName || null,
        phone: body.phone || null,
        shiftCount: Number(body.shiftCount || 0),
        dailyWage: Number(body.dailyWage || 75000),
      };
      data.employees.push(newEmp);
      saveSandboxData(data);
      return jsonOk({ data: newEmp }, 201);
    }
  }

  if (path.startsWith("/api/employees/")) {
    const id = decodeURIComponent(path.replace("/api/employees/", ""));
    const emp = data.employees.find((e) => e.id === id);
    if (!emp) return jsonErr("Karyawan tidak ditemukan", 404);

    if (method === "GET") return jsonOk({ data: emp });
    if (method === "PATCH") {
      const body = options?.body ? JSON.parse(options.body as string) : {};
      if (body.name) emp.name = body.name;
      if (body.bankAccountNo !== undefined) emp.bankAccountNo = body.bankAccountNo;
      if (body.bankName !== undefined) emp.bankName = body.bankName;
      if (body.phone !== undefined) emp.phone = body.phone;
      if (body.shiftCount !== undefined) emp.shiftCount = Number(body.shiftCount);
      if (body.dailyWage !== undefined) emp.dailyWage = Number(body.dailyWage);
      saveSandboxData(data);
      return jsonOk({ data: emp });
    }
    if (method === "DELETE") {
      data.employees = data.employees.filter((e) => e.id !== id);
      saveSandboxData(data);
      return jsonOk({ success: true });
    }
  }

  // Inventory CRUD
  if (path === "/api/inventory") {
    if (method === "GET") {
      const inv = data.products
        .filter((p) => p.category_type === "Bahan Baku")
        .map((p) => ({
          id: p.id,
          name: p.name,
          unitType: p.unit_type,
          stockQty: p.stock_qty,
          price: p.price,
        }));
      return jsonOk({ data: inv });
    }
    if (method === "POST") {
      const body = options?.body ? JSON.parse(options.body as string) : {};
      const newInv = {
        id: `b-${Date.now()}`,
        name: body.name,
        category: "Bahan Baku",
        price: body.price !== null ? Number(body.price) : null,
        category_type: "Bahan Baku",
        is_active: true,
        unit_type: body.unitType || "pcs",
        stock_qty: Number(body.stockQty || 0),
        image_url: null,
      };
      data.products.push(newInv);
      saveSandboxData(data);
      return jsonOk({
        data: {
          id: newInv.id,
          name: newInv.name,
          unitType: newInv.unit_type,
          stockQty: newInv.stock_qty,
          price: newInv.price,
        },
      }, 201);
    }
  }

  if (path.startsWith("/api/inventory/")) {
    const id = decodeURIComponent(path.replace("/api/inventory/", ""));
    const inv = data.products.find((p) => p.id === id);
    if (!inv) return jsonErr("Bahan baku tidak ditemukan", 404);

    if (method === "PATCH") {
      const body = options?.body ? JSON.parse(options.body as string) : {};
      if (body.name) inv.name = body.name;
      if (body.unitType) inv.unit_type = body.unitType;
      if (body.stockQty !== undefined) inv.stock_qty = Number(body.stockQty);
      if (body.price !== undefined) inv.price = body.price !== null ? Number(body.price) : null;
      saveSandboxData(data);
      return jsonOk({
        data: {
          id: inv.id,
          name: inv.name,
          unitType: inv.unit_type,
          stockQty: inv.stock_qty,
          price: inv.price,
        },
      });
    }
    if (method === "DELETE") {
      data.products = data.products.filter((p) => p.id !== id);
      saveSandboxData(data);
      return jsonOk({ success: true });
    }
  }

  // Suppliers CRUD
  if (path === "/api/suppliers") {
    if (method === "GET") return jsonOk({ data: data.suppliers });
    if (method === "POST") {
      const body = options?.body ? JSON.parse(options.body as string) : {};
      const newSup = {
        id: `sup-${Date.now()}`,
        name: body.name,
        location: body.location || null,
        contact: body.contact || null,
        notes: body.notes || null,
      };
      data.suppliers.push(newSup);
      saveSandboxData(data);
      return jsonOk({ data: newSup }, 201);
    }
  }

  if (path.startsWith("/api/suppliers/")) {
    const id = decodeURIComponent(path.replace("/api/suppliers/", ""));
    const sup = data.suppliers.find((s) => s.id === id);
    if (!sup) return jsonErr("Supplier tidak ditemukan", 404);

    if (method === "PATCH") {
      const body = options?.body ? JSON.parse(options.body as string) : {};
      if (body.name) sup.name = body.name;
      if (body.location !== undefined) sup.location = body.location;
      if (body.contact !== undefined) sup.contact = body.contact;
      if (body.notes !== undefined) sup.notes = body.notes;
      saveSandboxData(data);
      return jsonOk({ data: sup });
    }
    if (method === "DELETE") {
      data.suppliers = data.suppliers.filter((s) => s.id !== id);
      saveSandboxData(data);
      return jsonOk({ success: true });
    }
  }

  // Purchases: GET & POST
  if (path === "/api/purchases") {
    if (method === "GET") return jsonOk({ data: data.purchases });
    if (method === "POST") {
      const body = options?.body ? JSON.parse(options.body as string) : {};
      const sup = data.suppliers.find((s) => s.id === body.supplierId);
      const items = body.items || [];
      const total = items.reduce((acc: number, it: any) => acc + (it.unitCost || 0) * (it.qty || 1), 0);
      const newPur = {
        id: `pur-${Date.now()}`,
        supplierId: body.supplierId || null,
        supplierName: sup?.name || "Supplier Umum",
        purchaseDate: today,
        total,
        note: body.note || null,
        kind: "bahan",
        itemCount: items.length,
        items: items.map((it: any) => ({
          name: it.name || "Bahan Baku",
          qty: it.qty,
          unitCost: it.unitCost,
          subtotal: it.qty * it.unitCost,
        })),
      };
      data.purchases.unshift(newPur as any);
      saveSandboxData(data);
      return jsonOk({ data: { purchaseId: newPur.id, total } }, 201);
    }
  }

  // Expenses: GET & POST
  if (path === "/api/expenses") {
    if (method === "GET") return jsonOk({ data: data.expenses });
    if (method === "POST") {
      const body = options?.body ? JSON.parse(options.body as string) : {};
      const newExp = {
        id: `exp-${Date.now()}`,
        purchaseDate: body.purchaseDate || today,
        supplierName: null,
        note: body.note || "Pengeluaran",
        total: Number(body.total || 0),
        kind: "beban_lain",
      };
      data.expenses.unshift(newExp);
      saveSandboxData(data);
      return jsonOk({ data: { id: newExp.id } }, 201);
    }
  }

  // Salary: GET & POST & recorded
  if (path === "/api/salary") {
    if (method === "GET") {
      const total = data.employees.reduce((acc, e) => acc + e.dailyWage, 0);
      return jsonOk({
        data: {
          date: url.searchParams.get("date") || today,
          total,
          employeeCount: data.employees.length,
          recorded: data.recordedSalaries.includes(url.searchParams.get("date") || today),
        },
      });
    }
    if (method === "POST") {
      const body = options?.body ? JSON.parse(options.body as string) : {};
      const d = body.date || today;
      if (!data.recordedSalaries.includes(d)) {
        data.recordedSalaries.push(d);
      }
      const total = data.employees.reduce((acc, e) => acc + e.dailyWage, 0);
      saveSandboxData(data);
      return jsonOk({ data: { total, employeeCount: data.employees.length } });
    }
  }

  if (path === "/api/salary/recorded" && method === "GET") {
    return jsonOk({ data: data.recordedSalaries });
  }

  // Bonuses: GET, POST, DELETE, /consume
  if (path === "/api/bonuses") {
    if (method === "GET") return jsonOk({ data: data.bonuses });
    if (method === "POST") {
      const body = options?.body ? JSON.parse(options.body as string) : {};
      const emp = data.employees.find((e) => e.id === body.employeeId);
      const prod = data.products.find((p) => p.id === body.productId);
      const newBonus = {
        id: `bon-${Date.now()}`,
        employeeId: body.employeeId,
        employeeName: emp?.name || "Karyawan",
        productId: body.productId,
        productName: prod?.name || "Produk",
        unitType: "pcs",
        allocated: Number(body.allocated || 1),
        remaining: Number(body.allocated || 1),
      };
      data.bonuses.push(newBonus);
      saveSandboxData(data);
      return jsonOk({ data: newBonus }, 201);
    }
    if (method === "DELETE") {
      const id = url.searchParams.get("id");
      data.bonuses = data.bonuses.filter((b) => b.id !== id);
      saveSandboxData(data);
      return jsonOk({ success: true });
    }
  }

  if (path === "/api/bonuses/consume" && method === "POST") {
    const body = options?.body ? JSON.parse(options.body as string) : {};
    const bonus = data.bonuses.find((b) => b.id === body.id);
    if (!bonus) return jsonErr("Bonus tidak ditemukan", 404);
    bonus.remaining = Math.max(0, bonus.remaining - (body.qty || 1));
    saveSandboxData(data);
    return jsonOk({ data: { remaining: bonus.remaining, stock: 100 } });
  }

  // App settings: GET & PUT
  if (path.startsWith("/api/app-settings/")) {
    const key = path.replace("/api/app-settings/", "");
    if (method === "GET") {
      const val = (data.appSettings as any)[key] || null;
      return jsonOk({ data: { key, value: val } });
    }
    if (method === "PUT") {
      const body = options?.body ? JSON.parse(options.body as string) : {};
      (data.appSettings as any)[key] = body.value;
      saveSandboxData(data);
      return jsonOk({ data: { key, value: body.value } });
    }
  }

  // Admin Clear Datasets
  if (path === "/api/admin/clear-datasets" && method === "POST") {
    resetSandboxData();
    return jsonOk({ success: true, message: "Demo datasets reset" });
  }

  // Fallback
  return jsonOk({ data: [] });
}

// Global browser fetch interceptor
let interceptorInstalled = false;

export function setupDemoInterceptor() {
  if (typeof window === "undefined" || interceptorInstalled) return;

  const originalFetch = window.fetch;
  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const urlStr = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

    if (isDemoMode() && urlStr.includes("/api/") && !urlStr.includes("/api/auth/login") && !urlStr.includes("/api/auth/logout")) {
      try {
        const demoRes = await handleDemoRequest(urlStr, init);
        if (demoRes) return demoRes;
      } catch (err) {
        console.warn("[OpenPOS Sandbox] Fallback error:", err);
      }
    }

    return originalFetch.apply(this, [input, init]);
  };

  interceptorInstalled = true;
  console.log("⚡ OpenPOS In-Browser Sandbox (Demo Mode) initialized.");
}
