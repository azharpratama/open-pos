import { config } from "dotenv";
import { resolve } from "path";
import { createDbClient } from "../src/lib/db-client";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db as drizzleDb } from "../src/db";

// Load .env.local
config({ path: resolve(process.cwd(), ".env.local") });

const db = createDbClient();

async function seed() {
  console.log("🌱 Starting seed...");
  console.log("⏳ Ensuring database schema is ready...");
  await migrate(drizzleDb, { migrationsFolder: resolve(__dirname, "../src/db/migrations") });

  console.log("🧹 Clearing existing data...");
  const tables = [
    "cancellation_requests", "reservations", "order_items", "inventory_logs", "menu_ingredients", "employee_bonuses", 
    "purchase_items", "attendance", "operational_expenses", "orders", 
    "purchases", "shifts", "cashier_roster", "shift_schedules", 
    "employees", "products", "suppliers"
  ];
  
  // We cannot use the RPC because it uses unqualified DELETEs which fail pg_safeupdate.
  // Break circular dependencies before deleting
  await db.from("reservations").update({ order_id: null }).not("id", "is", null);
  await db.from("orders").update({ reservation_id: null }).not("id", "is", null);

  for (const t of tables) {
    const { error: delErr } = await db.from(t).delete().not("id", "is", null);
    if (delErr) console.warn(`Warn: failed to clear ${t}: ${delErr.message}`);
  }

  // 1. Suppliers
  console.log("📦 Seeding Suppliers...");
  const { data: suppliers, error: supErr } = await db.from("suppliers").insert([
    { name: "Distributor Biji Kopi", location: "Pasar Induk", contact: "081200000001" },
    { name: "Supplier Kemasan & Cup", location: "Jl. Merdeka", contact: "081200000002" },
    { name: "Distributor Bahan Baku", location: "Pasar Pagi", contact: "081200000003" }
  ]).select();
  if (supErr) throw new Error(supErr.message);

  // 2. Employees
  console.log("👥 Seeding Employees...");
  const { data: employees, error: empErr } = await db.from("employees").insert([
    { name: "Kasir Pagi", bank_name: "BCA", bank_account_no: "123456", phone: "081200000011", daily_wage: 75000 },
    { name: "Kasir Sore", bank_name: "Mandiri", bank_account_no: "654321", phone: "081200000012", daily_wage: 75000 },
    { name: "Barista Utama", bank_name: "BRI", bank_account_no: "999999", phone: "081200000013", daily_wage: 85000 }
  ]).select();
  if (empErr) throw new Error(empErr.message);

  // 3. Inventory (Bahan Baku)
  console.log("🗄️ Seeding Inventory...");
  const { data: inventory, error: invErr } = await db.from("products").insert([
    { name: "Biji Kopi Robusta", unit_type: "gr", stock_qty: 5000, price: 50, category: "Bahan Baku", category_type: "Bahan Baku", is_active: true }, // Rp 50/gr
    { name: "Biji Kopi Arabica", unit_type: "gr", stock_qty: 3000, price: 100, category: "Bahan Baku", category_type: "Bahan Baku", is_active: true }, 
    { name: "Susu Kental Manis", unit_type: "kaleng", stock_qty: 50, price: 15000, category: "Bahan Baku", category_type: "Bahan Baku", is_active: true },
    { name: "Cup Plastik 16oz", unit_type: "pcs", stock_qty: 1000, price: 500, category: "Bahan Baku", category_type: "Bahan Baku", is_active: true },
    { name: "Indomie Goreng", unit_type: "pcs", stock_qty: 200, price: 3000, category: "Bahan Baku", category_type: "Bahan Baku", is_active: true }
  ]).select();
  if (invErr) throw new Error(invErr.message);

  const invMap = Object.fromEntries(inventory!.map(i => [i.name, i.id]));

  // 4. Menu Items (Menu Jual)
  console.log("☕ Seeding Menu...");
  const { data: menu, error: menuErr } = await db.from("products").insert([
    { name: "Kopi Susu Spesial", category: "Kopi", price: 15000, category_type: "Menu Jual", is_active: true, unit_type: "pcs" },
    { name: "Kopi Hitam", category: "Kopi", price: 10000, category_type: "Menu Jual", is_active: true, unit_type: "pcs" },
    { name: "Indomie Goreng Telur", category: "Makanan", price: 12000, category_type: "Menu Jual", is_active: true, unit_type: "pcs" },
    { name: "Es Teh Manis", category: "Minuman", price: 5000, category_type: "Menu Jual", is_active: true, unit_type: "pcs" }
  ]).select();
  if (menuErr) throw new Error(menuErr.message);

  // 5. Menu Ingredients
  console.log("🧪 Seeding Ingredients...");
  const menuMap = Object.fromEntries(menu!.map(m => [m.name, m.id]));
  await db.from("menu_ingredients").insert([
    { menu_product_id: menuMap["Kopi Susu Spesial"], ingredient_product_id: invMap["Biji Kopi Robusta"], quantity: 15 },
    { menu_product_id: menuMap["Kopi Susu Spesial"], ingredient_product_id: invMap["Susu Kental Manis"], quantity: 0.1 },
    { menu_product_id: menuMap["Kopi Susu Spesial"], ingredient_product_id: invMap["Cup Plastik 16oz"], quantity: 1 },
    
    { menu_product_id: menuMap["Kopi Hitam"], ingredient_product_id: invMap["Biji Kopi Robusta"], quantity: 15 },
    { menu_product_id: menuMap["Kopi Hitam"], ingredient_product_id: invMap["Cup Plastik 16oz"], quantity: 1 },
    
    { menu_product_id: menuMap["Indomie Goreng Telur"], ingredient_product_id: invMap["Indomie Goreng"], quantity: 1 }
  ]);

  // 6. Shifts & Orders (Past 14 days to make charts look good)
  console.log("📅 Seeding Historical Shifts & Orders...");
  const now = new Date();

  // Helper to insert order and emulate RPC logic for stock deduction
  async function insertOrder(
    orderRef: string,
    oDate: string,
    isCash: boolean,
    subtotal: number,
    discount: number,
    total: number,
    customerName: string
  ) {
    const { data: orderData, error: orderErr } = await db.from("orders").insert({
      order_ref: orderRef,
      cashier_name: "Kasir Pagi",
      customer_name: customerName,
      order_type: "DINE_IN",
      payment_method: isCash ? "TUNAI" : "QRIS",
      payment_status: "SUCCESS",
      order_status: "SELESAI",
      subtotal,
      discount,
      total_amount: total,
      amount_paid: total,
      created_at: oDate
    }).select().single();
    if (orderErr) throw new Error(orderErr.message);
    
    const { error: itemErr } = await db.from("order_items").insert({
      order_id: orderData!.id,
      product_id: menuMap["Kopi Hitam"],
      product_name: "Kopi Hitam",
      quantity: 1,
      unit_price: 15000,
      subtotal_price: 15000
    });
    if (itemErr) throw new Error(itemErr.message);

    // Deduct stock & create logs
    const { data: ingredients } = await db.from("menu_ingredients").select("*").eq("menu_product_id", menuMap["Kopi Hitam"]);
    if (ingredients && ingredients.length > 0) {
      for (const ing of ingredients) {
        await db.from("inventory_logs").insert({
          product_id: ing.ingredient_product_id, qty_change: -ing.quantity, reason: "Terjual", order_id: orderData!.id, created_at: oDate
        });
        const { data: currentStock } = await db.from("products").select("stock_qty").eq("id", ing.ingredient_product_id).single();
        if (currentStock) {
          await db.from("products").update({ stock_qty: currentStock.stock_qty - ing.quantity }).eq("id", ing.ingredient_product_id);
        }
      }
    } else {
      await db.from("inventory_logs").insert({
        product_id: menuMap["Kopi Hitam"], qty_change: -1, reason: "Terjual", order_id: orderData!.id, created_at: oDate
      });
      const { data: currentStock } = await db.from("products").select("stock_qty").eq("id", menuMap["Kopi Hitam"]).single();
      if (currentStock) {
        await db.from("products").update({ stock_qty: currentStock.stock_qty - 1 }).eq("id", menuMap["Kopi Hitam"]);
      }
    }
  }
  
  for (let i = 13; i >= 0; i--) {
    const shiftDate = new Date(now);
    shiftDate.setDate(now.getDate() - i);
    
    const yyyy = shiftDate.getFullYear();
    const mm = String(shiftDate.getMonth() + 1).padStart(2, "0");
    const dd = String(shiftDate.getDate()).padStart(2, "0");
    const dateStr = `${yyyy}-${mm}-${dd}`;
    
    // Siang Shift (10:00 - 16:00)
    const siangOpen = new Date(`${dateStr}T10:00:00+07:00`).toISOString();
    const siangClose = new Date(`${dateStr}T16:00:00+07:00`).toISOString();
    
    const { data: siangShift } = await db.from("shifts").insert({
      cashier_name: "Kasir Pagi",
      opened_at: siangOpen,
      closed_at: siangClose,
      revenue: 0 // Will update later
    }).select().single();
    
    // Malam Shift (17:00 - 23:00)
    const malamOpen = new Date(`${dateStr}T17:00:00+07:00`).toISOString();
    const malamClose = new Date(`${dateStr}T23:00:00+07:00`).toISOString();
    
    const { data: malamShift } = await db.from("shifts").insert({
      cashier_name: "Kasir Sore",
      opened_at: malamOpen,
      closed_at: malamClose,
      revenue: 0
    }).select().single();

    // Create random orders for Siang
    let siangRev = 0;
    const siangOrdersCount = Math.floor(Math.random() * 15) + 5; // 5 to 20 orders
    for(let o=0; o < siangOrdersCount; o++) {
      const isCash = Math.random() > 0.5;
      const orderRef = `SEED-${dateStr}-S-${o}`;
      const subtotal = 15000;
      const discount = (o % 4 === 0) ? 2000 : 0; // Every 4th order gets a Rp 2.000 discount
      const total = subtotal - discount;
      siangRev += total;
      
      const orderDate = new Date(new Date(siangOpen).getTime() + (o * 15 * 60000)).toISOString();
      await insertOrder(orderRef, orderDate, isCash, subtotal, discount, total, `Pelanggan S-${o}`);
    }

    // Create random orders for Malam
    let malamRev = 0;
    const malamOrdersCount = Math.floor(Math.random() * 20) + 10; // 10 to 30 orders
    for(let o=0; o < malamOrdersCount; o++) {
      const isCash = Math.random() > 0.5;
      const orderRef = `SEED-${dateStr}-M-${o}`;
      const total = 15000;
      malamRev += total;
      
      const orderDate = new Date(new Date(malamOpen).getTime() + (o * 15 * 60000)).toISOString();
      await insertOrder(orderRef, orderDate, isCash, 15000, 0, total, `Pelanggan M-${o}`);
    }

    // Update shift revenues
    await db.from("shifts").update({ revenue: siangRev }).eq("id", siangShift!.id);
    await db.from("shifts").update({ revenue: malamRev }).eq("id", malamShift!.id);

    // 7. Schedule & Salary
    // Add schedule
    const { error: scheduleErr } = await db.from("shift_schedules").insert([
      { work_date: dateStr, start_time: "09:00", end_time: "17:00", shift_type: "SIANG", employee_ids: [employees![0].id] },
      { work_date: dateStr, start_time: "17:00", end_time: "02:00", shift_type: "MALAM", employee_ids: [employees![1].id, employees![2].id] },
    ]);
    if (scheduleErr) throw new Error(scheduleErr.message);
    
    // Record salary using the RPC (this will insert a purchase with kind = 'gaji')
    const { error: salaryErr } = await db.rpc("record_daily_salary", { p_date: dateStr });
    if (salaryErr) throw new Error(salaryErr.message);

    // 8. Purchases (1 purchase every 3 days for bahan)
    if (i % 3 === 0) {
      const purchaseRes = await db.from("purchases").insert({
        supplier_id: suppliers![0].id,
        total: 100000,
        note: "Stok mingguan",
        kind: "bahan",
        purchase_date: dateStr,
        created_at: siangOpen
      }).select().single();
      
      await db.from("purchase_items").insert({
        purchase_id: purchaseRes.data!.id,
        inventory_id: invMap["Biji Kopi Robusta"],
        qty: 2000,
        unit_cost: 50,
        subtotal: 100000
      });
    }

    // 9. Beban Lain-lain (Every 7 days)
    if (i % 7 === 0) {
      await db.from("purchases").insert({
        total: 250000,
        note: "Bayar Listrik & Air",
        kind: "operasional", // or anything else other than 'bahan' and 'gaji'
        purchase_date: dateStr,
        created_at: siangOpen
      });
    }
  }

  // Set the latest Malam shift to be OPEN (no closed_at) so the dashboard shows "Shift Berjalan"
  const openShift = await db.from("shifts").insert({
    opened_at: new Date().toISOString(),
    revenue: 25000
  }).select().single();

  const nowOrderDate = new Date().toISOString();
  const { data: nowOrderData, error: nowOrderErr } = await db.from("orders").insert({
    order_ref: `SEED-NOW-1`,
    cashier_name: "Kasir Pagi",
    customer_name: `Pelanggan Aktif`,
    order_type: "DINE_IN",
    payment_method: "TUNAI",
    payment_status: "SUCCESS",
    order_status: "SELESAI",
    subtotal: 25000,
    total_amount: 25000,
    amount_paid: 25000,
    created_at: nowOrderDate
  }).select().single();
  if (nowOrderErr) throw new Error(nowOrderErr.message);

  const { error: nowItemErr } = await db.from("order_items").insert({
    order_id: nowOrderData.id,
    product_id: menuMap["Kopi Susu Spesial"],
    product_name: "Kopi Susu Spesial",
    quantity: 1,
    unit_price: 15000,
    subtotal_price: 15000
  });
  if (nowItemErr) throw new Error(nowItemErr.message);

  // 10. Open Bills & Reservations
  console.log("📝 Seeding Open Bills & Reservations...");
  
  // Create an Open Bill
  const { data: openBillData, error: openBillErr } = await db.from("orders").insert({
    order_ref: `SEED-NOW-OPEN-1`,
    cashier_name: "Kasir Pagi",
    customer_name: "Meja 04 (Open Bill)",
    order_type: "DINE_IN",
    payment_method: null,
    payment_status: "PENDING",
    order_status: "ANTRIAN",
    subtotal: 12000,
    total_amount: 12000,
    amount_paid: 0,
    is_open_bill: true,
    created_at: nowOrderDate
  }).select().single();
  if (openBillErr) throw new Error(openBillErr.message);

  await db.from("order_items").insert({
    order_id: openBillData.id,
    product_id: menuMap["Indomie Goreng Telur"],
    product_name: "Indomie Goreng Telur",
    quantity: 1,
    unit_price: 12000,
    subtotal_price: 12000
  });

  // Create a pending Cancellation Request for the Open Bill
  await db.from("cancellation_requests").insert({
    order_id: openBillData.id,
    requested_by: "Kasir Pagi",
    reason: "Pelanggan salah pesan",
    status: "PENDING"
  });

  // Create a Reservation (CONFIRMED)
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const tomStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
  
  await db.from("reservations").insert({
    customer_name: "Reservasi VIP Meja 12",
    customer_phone: "081200000099",
    floor_number: 2,
    reservation_date: tomStr,
    start_time: "19:00:00",
    end_time: "21:00:00",
    minimum_spend: 300000,
    deposit_amount: 150000,
    deposit_method: "TRANSFER",
    status: "CONFIRMED",
    notes: "Tolong siapkan asbak"
  });

  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  // Create a Reservation (CHECKED_IN) - linked to an Order
  const { data: resCheckedIn } = await db.from("reservations").insert({
    customer_name: "Acara Ulang Tahun",
    customer_phone: "081200000088",
    floor_number: 1,
    reservation_date: todayStr,
    start_time: "16:00:00",
    end_time: "19:00:00",
    minimum_spend: 500000,
    deposit_amount: 250000,
    deposit_method: "TRANSFER",
    status: "CHECKED_IN",
    notes: "Ada kue ultah"
  }).select().single();

  const { data: resOrderData } = await db.from("orders").insert({
    order_ref: `SEED-RES-1`,
    cashier_name: "Kasir Pagi",
    customer_name: "Acara Ulang Tahun",
    order_type: "DINE_IN",
    payment_method: null,
    payment_status: "DEPOSIT",
    order_status: "ANTRIAN",
    subtotal: 50000,
    total_amount: 50000,
    amount_paid: 250000,
    is_open_bill: false,
    reservation_id: resCheckedIn!.id,
    created_at: nowOrderDate
  }).select().single();

  await db.from("reservations").update({ order_id: resOrderData!.id }).eq("id", resCheckedIn!.id);

  console.log("✅ Seed complete! Refresh your app to see the populated dashboard.");
}

seed().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
