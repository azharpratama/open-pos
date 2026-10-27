// Canonical definitions for the owner "Clear Dataset" tool
// (/owner/settings/cleardataset). Shared by the client page (labels + selection
// logic) and the API route (target validation). The keys here must match the
// branches in the admin_clear_datasets() RPC exactly.

export const DATASET_KEYS = [
  "sales",
  "sales_log",
  "bookkeeping",
  "employees",
  "menu",
  "inventory",
  "procurement",
] as const;

export type DatasetKey = (typeof DATASET_KEYS)[number];

export function isDatasetKey(v: unknown): v is DatasetKey {
  return typeof v === "string" && (DATASET_KEYS as readonly string[]).includes(v);
}

export type DatasetMeta = {
  key: DatasetKey;
  label: string;
  // What gets wiped, in plain Indonesian — shown under each option.
  description: string;
  // Tables the option is responsible for (for the "apa yang dihapus" list).
  tables: string;
  // Datasets that MUST be cleared alongside this one because of foreign keys.
  // Selecting the key auto-selects these; deselecting a required dependency is
  // blocked while a dependent is still selected.
  requires: DatasetKey[];
};

export const DATASETS: DatasetMeta[] = [
  {
    key: "sales",
    label: "Penjualan",
    description:
      "Semua transaksi penjualan: order, item order, pengurangan stok akibat penjualan, permintaan pembatalan, dan reservasi yang tertaut order.",
    tables:
      "orders, order_items, inventory_logs (dari order), cancellation_requests, reservations (tertaut)",
    requires: [],
  },
  {
    key: "sales_log",
    label: "Log Penjualan",
    description:
      "Riwayat buka/tutup shift kasir beserta pendapatannya, dan roster kasir harian.",
    tables: "shifts, cashier_roster",
    requires: [],
  },
  {
    key: "bookkeeping",
    label: "Pembukuan",
    description:
      "Catatan gaji karyawan yang sudah direkap & pengeluaran lain-lain (di luar pembelian bahan baku).",
    tables: "operational_expenses, purchases (gaji & lain-lain) + itemnya",
    requires: [],
  },
  {
    key: "employees",
    label: "Karyawan",
    description:
      "Data karyawan, jadwal shift, absensi, dan alokasi bonus karyawan.",
    tables: "employees, shift_schedules, attendance, employee_bonuses",
    requires: [],
  },
  {
    key: "menu",
    label: "Menu",
    description:
      "Daftar menu jual beserta resep bahannya. Karena transaksi memakai menu, Penjualan ikut dihapus.",
    tables: "products (Menu Jual), menu_ingredients",
    requires: ["sales"],
  },
  {
    key: "inventory",
    label: "Inventory",
    description:
      "Stok bahan baku, kartu stok, dan resep bahan. Karena pembelian memakai bahan, Procurement ikut dihapus.",
    tables: "products (Bahan Baku), inventory_logs, menu_ingredients",
    requires: ["procurement"],
  },
  {
    key: "procurement",
    label: "Procurement",
    description:
      "Riwayat pembelian bahan baku beserta itemnya, dan seluruh daftar supplier.",
    tables: "purchases (bahan), purchase_items, suppliers",
    requires: [],
  },
];

export const DATASET_BY_KEY: Record<DatasetKey, DatasetMeta> = Object.fromEntries(
  DATASETS.map((d) => [d.key, d]),
) as Record<DatasetKey, DatasetMeta>;

// Expand a selection to include every required companion (transitive closure),
// so the set sent to the server can never trip a cross-dataset foreign key.
export function withRequired(selected: Iterable<DatasetKey>): Set<DatasetKey> {
  const out = new Set<DatasetKey>();
  const stack = [...selected];
  while (stack.length) {
    const key = stack.pop()!;
    if (out.has(key)) continue;
    out.add(key);
    for (const req of DATASET_BY_KEY[key].requires) {
      if (!out.has(req)) stack.push(req);
    }
  }
  return out;
}

// Human labels for the row-count summary the RPC returns (per underlying table).
export const TABLE_LABELS: Record<string, string> = {
  orders: "Order",
  order_items: "Item order",
  cancellation_requests: "Permintaan pembatalan",
  reservations: "Reservasi",
  inventory_logs: "Kartu stok",
  shifts: "Shift",
  cashier_roster: "Roster kasir",
  operational_expenses: "Pengeluaran manual",
  purchases: "Pembelian",
  purchase_items: "Item pembelian",
  employee_bonuses: "Bonus karyawan",
  attendance: "Absensi",
  shift_schedules: "Jadwal shift",
  employees: "Karyawan",
  menu_ingredients: "Resep bahan",
  products_menu: "Menu jual",
  products_inventory: "Bahan baku",
  suppliers: "Supplier",
};
