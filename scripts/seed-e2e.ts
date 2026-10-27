import { config } from "dotenv";
import { resolve } from "path";
import { createDbClient } from "../src/lib/db-client";

// Load .env.local
config({ path: resolve(process.cwd(), ".env.local") });

const db = createDbClient();

async function seedE2E() {
  console.log("🌱 Starting E2E seed...");

  console.log("🔐 Resetting Auth passwords...");
  const { data: { users } } = await db.auth.admin.listUsers();
  if (users) {
    for (const u of users) {
      if (u.email === "owner@openpos.dev" || u.email === "kasir@openpos.dev") {
        await db.auth.admin.updateUserById(u.id, { password: "password123" });
      }
    }
  }

  console.log("🧹 Clearing existing data...");
  const tables = [
    "cancellation_requests", "reservations", "order_items", "inventory_logs", "menu_ingredients", "employee_bonuses", 
    "purchase_items", "attendance", "operational_expenses", "orders", 
    "purchases", "shifts", "cashier_roster", "shift_schedules", 
    "employees", "products", "suppliers"
  ];
  
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
    { name: "Supplier E2E", location: "Jl. E2E", contact: "08111222333" }
  ]).select();
  if (supErr) throw new Error(supErr.message);

  // 2. Employees
  console.log("👥 Seeding Employees...");
  const { data: employees, error: empErr } = await db.from("employees").insert([
    { name: "Kasir E2E", bank_name: "BCA", bank_account_no: "111", phone: "0811", daily_wage: 75000 }
  ]).select();
  if (empErr) throw new Error(empErr.message);

  // 3. Inventory (Bahan Baku)
  console.log("🗄️ Seeding Inventory...");
  const { data: inventory, error: invErr } = await db.from("products").insert([
    { name: "Biji Kopi E2E", unit_type: "gr", stock_qty: 1000, price: 50, category: "Bahan Baku", category_type: "Bahan Baku", is_active: true },
    { name: "Cup E2E", unit_type: "pcs", stock_qty: 100, price: 500, category: "Bahan Baku", category_type: "Bahan Baku", is_active: true }
  ]).select();
  if (invErr) throw new Error(invErr.message);

  const invMap = Object.fromEntries(inventory!.map(i => [i.name, i.id]));

  // 4. Menu Items (Menu Jual)
  console.log("☕ Seeding Menu...");
  const { data: menu, error: menuErr } = await db.from("products").insert([
    { name: "Kopi E2E", category: "Kopi", price: 15000, category_type: "Menu Jual", is_active: true, unit_type: "pcs" }
  ]).select();
  if (menuErr) throw new Error(menuErr.message);

  // 5. Menu Ingredients
  console.log("🧪 Seeding Ingredients...");
  const menuMap = Object.fromEntries(menu!.map(m => [m.name, m.id]));
  await db.from("menu_ingredients").insert([
    { menu_product_id: menuMap["Kopi E2E"], ingredient_product_id: invMap["Biji Kopi E2E"], quantity: 15 },
    { menu_product_id: menuMap["Kopi E2E"], ingredient_product_id: invMap["Cup E2E"], quantity: 1 }
  ]);

  // 6. Schedule Kasir E2E for today
  console.log("📅 Seeding Shift Schedule...");
  const today = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).slice(0, 10);
  await db.from("shift_schedules").insert([
    { work_date: today, shift_type: 'SIANG', start_time: '09:00', end_time: '17:00', employee_ids: [employees![0].id] },
    { work_date: today, shift_type: 'MALAM', start_time: '17:00', end_time: '02:00', employee_ids: [employees![0].id] }
  ]);

  // 7. Employee Bonuses
  console.log("🎁 Seeding Bonuses...");
  await db.from("employee_bonuses").insert([
    { employee_id: employees![0].id, product_id: menu![0].id, allocated: 5, remaining: 5 }
  ]);

  // 8. Open Bills & Reservations for E2E Tests
  console.log("📝 Seeding Open Bills & Reservations...");
  
  // Create an Open Bill (used in order.spec.ts if we add open bill flow, or reservations.spec.ts)
  const { data: openBillData } = await db.from("orders").insert({
    order_ref: `E2E-OPEN-1`,
    cashier_name: "Kasir E2E",
    customer_name: "Pelanggan Meja 02",
    order_type: "DINE_IN",
    payment_method: null,
    payment_status: "PENDING",
    order_status: "ANTRIAN",
    subtotal: 15000,
    total_amount: 15000,
    amount_paid: 0,
    is_open_bill: true,
    created_at: new Date().toISOString()
  }).select().single();

  await db.from("order_items").insert({
    order_id: openBillData!.id,
    product_id: menuMap["Kopi E2E"],
    product_name: "Kopi E2E",
    quantity: 1,
    unit_price: 15000,
    subtotal_price: 15000
  });

  // Create a pending Cancellation Request for the Open Bill
  await db.from("cancellation_requests").insert({
    order_id: openBillData!.id,
    requested_by: "Kasir E2E",
    reason: "Pelanggan salah pesan",
    status: "PENDING"
  });

  // Create a Reservation (CONFIRMED) to test Check-In
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
  
  await db.from("reservations").insert({
    customer_name: "Reservasi VIP",
    customer_phone: "081200000099",
    floor_number: 2,
    reservation_date: today, // Ensure it's today so Kasir sees it in Antrian for Check-in
    start_time: "19:00:00",
    end_time: "21:00:00",
    minimum_spend: 300000,
    deposit_amount: 150000,
    deposit_method: "TRANSFER",
    status: "CONFIRMED",
    notes: "Tolong siapkan asbak"
  });

  console.log("✅ E2E Seed complete! Ready for tests.");
}

seedE2E().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
