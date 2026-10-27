import {
  pgTable,
  uuid,
  text,
  numeric,
  integer,
  boolean,
  timestamp,
  date,
  time,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ==========================================
// ENUMS
// ==========================================
export const userRoleEnum = pgEnum("user_role", ["owner", "karyawan"]);
export const orderTypeEnum = pgEnum("order_type", ["DINE_IN", "TAKEAWAY"]);
export const paymentMethodEnum = pgEnum("payment_method", ["TUNAI", "QRIS", "TRANSFER"]);
export const paymentStatusEnum = pgEnum("payment_status", ["PENDING", "SUCCESS", "DEPOSIT", "REFUNDED"]);
export const orderStatusEnum = pgEnum("order_status", ["ANTRIAN", "SELESAI", "DIBATALKAN"]);
export const categoryTypeEnum = pgEnum("category_type", ["Bahan Baku", "Menu Jual"]);
export const shiftTypeEnum = pgEnum("shift_type", ["SIANG", "MALAM"]);

// ==========================================
// TABLES
// ==========================================

// 1. Users & Better Auth Tables
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").unique().notNull(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: userRoleEnum("role").notNull().default("karyawan"),
  passwordHash: text("password_hash"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
});

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const user = users;
export const session = sessions;
export const account = accounts;
export const verification = verifications;

// 2. Suppliers
export const suppliers = pgTable("suppliers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  location: text("location"),
  contact: text("contact"),
  notes: text("notes"),
});

// 3. Products (Menu Items & Raw Materials)
export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  supplierId: uuid("supplier_id").references(() => suppliers.id),
  name: text("name").notNull(),
  unitType: text("unit_type").notNull().default("pcs"),
  stockQty: numeric("stock_qty", { precision: 12, scale: 2 }).notNull().default("0"),
  price: numeric("price", { precision: 12, scale: 2 }),
  categoryType: categoryTypeEnum("category_type").notNull().default("Menu Jual"),
  category: text("category").notNull(),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").notNull().default(true),
});

// 4. Menu Ingredients (Bill of Materials Recipe Mapping)
export const menuIngredients = pgTable("menu_ingredients", {
  id: uuid("id").primaryKey().defaultRandom(),
  menuProductId: uuid("menu_product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  ingredientProductId: uuid("ingredient_product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  quantity: numeric("quantity", { precision: 12, scale: 4 }).notNull(),
});

// 5. Reservations (Defined before orders due to cross-references)
export const reservations = pgTable("reservations", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone"),
  floorNumber: integer("floor_number").notNull().default(1),
  reservationDate: date("reservation_date").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  minimumSpend: numeric("minimum_spend", { precision: 12, scale: 2 }).notNull().default("0"),
  depositAmount: numeric("deposit_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  depositMethod: text("deposit_method"),
  status: text("status").notNull().default("CONFIRMED"),
  notes: text("notes"),
  createdBy: uuid("created_by").references(() => users.id),
  orderId: uuid("order_id"), // Cross-references orders.id
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 6. Orders
export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  orderRef: text("order_ref").unique().notNull(),
  cashierName: text("cashier_name").notNull(),
  customerName: text("customer_name").notNull(),
  orderType: orderTypeEnum("order_type").notNull().default("DINE_IN"),
  tableNumber: integer("table_number"),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
  tax: numeric("tax", { precision: 12, scale: 2 }).notNull().default("0"),
  discount: numeric("discount", { precision: 12, scale: 2 }).notNull().default("0"),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
  paymentMethod: paymentMethodEnum("payment_method"),
  paymentStatus: paymentStatusEnum("payment_status").notNull().default("PENDING"),
  orderStatus: orderStatusEnum("order_status").notNull().default("ANTRIAN"),
  amountPaid: numeric("amount_paid", { precision: 12, scale: 2 }).notNull().default("0"),
  changeAmount: numeric("change_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  isOpenBill: boolean("is_open_bill").notNull().default(false),
  reservationId: uuid("reservation_id").references(() => reservations.id),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 7. Order Items
export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: uuid("product_id").references(() => products.id),
  productName: text("product_name").notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  subtotalPrice: numeric("subtotal_price", { precision: 12, scale: 2 }).notNull(),
  modifier: text("modifier"),
});

// 8. Inventory Logs
export const inventoryLogs = pgTable("inventory_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull().references(() => products.id),
  qtyChange: numeric("qty_change", { precision: 12, scale: 4 }).notNull(),
  reason: text("reason").notNull(),
  orderId: uuid("order_id").references(() => orders.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 9. Shifts & Roster
export const shifts = pgTable("shifts", {
  id: uuid("id").primaryKey().defaultRandom(),
  cashierName: text("cashier_name").notNull(),
  openedAt: timestamp("opened_at", { withTimezone: true }).defaultNow().notNull(),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  openingCash: numeric("opening_cash", { precision: 12, scale: 2 }).notNull().default("0"),
  closingCash: numeric("closing_cash", { precision: 12, scale: 2 }),
  revenue: numeric("revenue", { precision: 12, scale: 2 }),
  notes: text("notes"),
});

export const shiftSchedules = pgTable("shift_schedules", {
  id: uuid("id").primaryKey().defaultRandom(),
  workDate: date("work_date").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  shiftType: shiftTypeEnum("shift_type").notNull(),
  employeeIds: uuid("employee_ids").array().notNull(),
});

// 10. HR & Payroll
export const employees = pgTable("employees", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  bankName: text("bank_name"),
  bankAccountNo: text("bank_account_no"),
  phone: text("phone"),
  dailyWage: numeric("daily_wage", { precision: 12, scale: 2 }).notNull().default("0"),
  shiftCount: integer("shift_count").notNull().default(0),
});

export const employeeBonuses = pgTable("employee_bonuses", {
  id: uuid("id").primaryKey().defaultRandom(),
  employeeId: uuid("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  bonusDate: date("bonus_date").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  reason: text("reason").notNull(),
});

export const attendance = pgTable("attendance", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  clockIn: timestamp("clock_in", { withTimezone: true }).defaultNow().notNull(),
  clockOut: timestamp("clock_out", { withTimezone: true }),
});

// 11. Operations, Procurement & Expenses
export const operationalExpenses = pgTable("operational_expenses", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  category: text("category").notNull(),
  expenseDate: date("expense_date").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const purchases = pgTable("purchases", {
  id: uuid("id").primaryKey().defaultRandom(),
  supplierId: uuid("supplier_id").references(() => suppliers.id),
  purchaseDate: date("purchase_date").notNull(),
  total: numeric("total", { precision: 12, scale: 2 }).notNull().default("0"),
  note: text("note"),
  kind: text("kind").notNull().default("bahan"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const purchaseItems = pgTable("purchase_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  purchaseId: uuid("purchase_id").notNull().references(() => purchases.id, { onDelete: "cascade" }),
  productId: uuid("product_id").references(() => products.id),
  productName: text("product_name"),
  quantity: numeric("quantity", { precision: 12, scale: 2 }).notNull(),
  unitCost: numeric("unit_cost", { precision: 12, scale: 2 }).notNull(),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
});

export const cancellationRequests = pgTable("cancellation_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull().references(() => orders.id),
  itemIds: uuid("item_ids").array(),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("PENDING"),
  refundAmount: numeric("refund_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  refundMethod: text("refund_method"),
  requestedBy: uuid("requested_by").references(() => users.id),
  reviewedBy: uuid("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ==========================================
// RELATIONS
// ==========================================
export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
  expenses: many(operationalExpenses),
  attendances: many(attendance),
  sessions: many(sessions),
  accounts: many(accounts),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  products: many(products),
  purchases: many(purchases),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  supplier: one(suppliers, {
    fields: [products.supplierId],
    references: [suppliers.id],
  }),
  orderItems: many(orderItems),
  inventoryLogs: many(inventoryLogs),
  recipeIngredients: many(menuIngredients, { relationName: "menuProduct" }),
  usedInMenus: many(menuIngredients, { relationName: "ingredientProduct" }),
}));

export const menuIngredientsRelations = relations(menuIngredients, ({ one }) => ({
  menuProduct: one(products, {
    fields: [menuIngredients.menuProductId],
    references: [products.id],
    relationName: "menuProduct",
  }),
  ingredientProduct: one(products, {
    fields: [menuIngredients.ingredientProductId],
    references: [products.id],
    relationName: "ingredientProduct",
  }),
}));

export const reservationsRelations = relations(reservations, ({ one }) => ({
  creator: one(users, {
    fields: [reservations.createdBy],
    references: [users.id],
  }),
  order: one(orders, {
    fields: [reservations.orderId],
    references: [orders.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  reservation: one(reservations, {
    fields: [orders.reservationId],
    references: [reservations.id],
  }),
  items: many(orderItems),
  inventoryLogs: many(inventoryLogs),
  cancellations: many(cancellationRequests),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

export const employeesRelations = relations(employees, ({ many }) => ({
  bonuses: many(employeeBonuses),
}));

export const employeeBonusesRelations = relations(employeeBonuses, ({ one }) => ({
  employee: one(employees, {
    fields: [employeeBonuses.employeeId],
    references: [employees.id],
  }),
}));

export const purchasesRelations = relations(purchases, ({ one }) => ({
  supplier: one(suppliers, {
    fields: [purchases.supplierId],
    references: [suppliers.id],
  }),
}));

export const cancellationRequestsRelations = relations(cancellationRequests, ({ one }) => ({
  order: one(orders, {
    fields: [cancellationRequests.orderId],
    references: [orders.id],
  }),
  requestedByUser: one(users, {
    fields: [cancellationRequests.requestedBy],
    references: [users.id],
  }),
  reviewedByUser: one(users, {
    fields: [cancellationRequests.reviewedBy],
    references: [users.id],
  }),
}));
