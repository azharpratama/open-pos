import type { Sql } from "postgres";

export async function revokeUserSessions(conn: Sql, params: { uid: string }) {
  try {
    const [exists] = await conn`
      SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth'
    `;
    if (exists) {
      await conn.unsafe(`DELETE FROM auth.sessions WHERE user_id = $1`, [params.uid]);
    }
  } catch {
    // ignore if auth schema does not exist
  }
  return [];
}

export async function adminClearDatasets(
  conn: Sql,
  params: {
    p_targets?: string[] | null;
    targets?: string[] | null;
  }
) {
  const rawTargets = params.p_targets || params.targets || [];
  const targets = Array.isArray(rawTargets) ? rawTargets : [rawTargets];

  const validTargets = [
    "sales", "sales_log", "bookkeeping", "employees",
    "menu", "inventory", "procurement", "all"
  ];

  for (const t of targets) {
    if (!validTargets.includes(t)) {
      throw new Error(`Target dataset tidak dikenal: ${t}`);
    }
  }

  const hasSales = targets.includes("sales") || targets.includes("all");
  const hasSalesLog = targets.includes("sales_log") || targets.includes("all");
  const hasBookkeeping = targets.includes("bookkeeping") || targets.includes("all");
  const hasEmployees = targets.includes("employees") || targets.includes("all");
  const hasMenu = targets.includes("menu") || targets.includes("all");
  const hasInventory = targets.includes("inventory") || targets.includes("all");
  const hasProcurement = targets.includes("procurement") || targets.includes("all");

  if (!hasSales && !hasSalesLog && !hasBookkeeping && !hasEmployees && !hasMenu && !hasInventory && !hasProcurement) {
    throw new Error("Tidak ada dataset yang dipilih");
  }

  return await conn.begin(async (sql) => {
    if (hasMenu && !hasSales) {
      const [hasOrderItems] = await sql`SELECT 1 FROM public.order_items LIMIT 1`;
      if (hasOrderItems) {
        throw new Error("Hapus Menu butuh Penjualan ikut dihapus (ada transaksi yang memakai menu).");
      }
    }

    if (hasInventory && !hasProcurement) {
      const [hasPurchaseItems] = await sql`SELECT 1 FROM public.purchase_items LIMIT 1`;
      if (hasPurchaseItems) {
        throw new Error("Hapus Inventory butuh Procurement ikut dihapus (ada pembelian yang memakai bahan).");
      }
    }

    const result: Record<string, number> = {};

    if (hasSales) {
      const res = await sql`DELETE FROM public.order_items`;
      result.order_items = res.count;
    }

    if (hasInventory) {
      const res = await sql`DELETE FROM public.inventory_logs`;
      result.inventory_logs = res.count;
    } else if (hasSales) {
      const res = await sql`DELETE FROM public.inventory_logs WHERE order_id IS NOT NULL`;
      result.inventory_logs = res.count;
    }

    if (hasMenu || hasInventory) {
      const res = await sql`DELETE FROM public.menu_ingredients`;
      result.menu_ingredients = res.count;
    }

    if (hasEmployees) {
      const res = await sql`DELETE FROM public.employee_bonuses`;
      result.employee_bonuses = res.count;
    } else if (hasMenu || hasInventory) {
      const res = await sql`
        DELETE FROM public.employee_bonuses eb
        USING public.products p
        WHERE eb.product_id = p.id
          AND ((${hasMenu} AND p.category_type = 'Menu Jual')
            OR (${hasInventory} AND p.category_type = 'Bahan Baku'))
      `;
      result.employee_bonuses = res.count;
    }

    if (hasProcurement && hasBookkeeping) {
      const res = await sql`DELETE FROM public.purchase_items`;
      result.purchase_items = res.count;
    } else if (hasProcurement) {
      const res = await sql`
        DELETE FROM public.purchase_items pi
        USING public.purchases p
        WHERE pi.purchase_id = p.id AND p.kind = 'bahan'
      `;
      result.purchase_items = res.count;
    } else if (hasBookkeeping) {
      const res = await sql`
        DELETE FROM public.purchase_items pi
        USING public.purchases p
        WHERE pi.purchase_id = p.id AND p.kind <> 'bahan'
      `;
      result.purchase_items = res.count;
    }

    if (hasEmployees) {
      const res = await sql`DELETE FROM public.attendance`;
      result.attendance = res.count;
    }

    if (hasBookkeeping) {
      const res = await sql`DELETE FROM public.operational_expenses`;
      result.operational_expenses = res.count;
    }

    if (hasSales) {
      const r1 = await sql`DELETE FROM public.cancellation_requests`;
      result.cancellation_requests = r1.count;

      await sql`UPDATE public.orders SET reservation_id = null WHERE reservation_id IS NOT NULL`;
      const r2 = await sql`DELETE FROM public.reservations WHERE order_id IS NOT NULL`;
      result.reservations = r2.count;

      const r3 = await sql`DELETE FROM public.orders`;
      result.orders = r3.count;
    }

    if (hasProcurement && hasBookkeeping) {
      const res = await sql`DELETE FROM public.purchases`;
      result.purchases = res.count;
    } else if (hasProcurement) {
      const res = await sql`DELETE FROM public.purchases WHERE kind = 'bahan'`;
      result.purchases = res.count;
    } else if (hasBookkeeping) {
      const res = await sql`DELETE FROM public.purchases WHERE kind <> 'bahan'`;
      result.purchases = res.count;
    }

    if (hasSalesLog) {
      const r1 = await sql`DELETE FROM public.shifts`;
      result.shifts = r1.count;
      try {
        const r2 = await sql`DELETE FROM public.cashier_roster`;
        result.cashier_roster = r2.count;
      } catch {
        // roster table optional
      }
    }

    if (hasEmployees) {
      const r1 = await sql`DELETE FROM public.shift_schedules`;
      result.shift_schedules = r1.count;
      const r2 = await sql`DELETE FROM public.employees`;
      result.employees = r2.count;
    }

    if (hasMenu) {
      const res = await sql`DELETE FROM public.products WHERE category_type = 'Menu Jual'`;
      result.products_menu = res.count;
    }

    if (hasInventory) {
      const res = await sql`DELETE FROM public.products WHERE category_type = 'Bahan Baku'`;
      result.products_inventory = res.count;
    }

    if (hasProcurement) {
      await sql`UPDATE public.products SET supplier_id = null WHERE supplier_id IS NOT NULL`;
      await sql`UPDATE public.purchases SET supplier_id = null WHERE supplier_id IS NOT NULL`;
      const res = await sql`DELETE FROM public.suppliers`;
      result.suppliers = res.count;
    }

    return [result];
  });
}
