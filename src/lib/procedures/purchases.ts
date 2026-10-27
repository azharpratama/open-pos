import type { Sql } from "postgres";

export async function recordPurchase(
  conn: Sql,
  params: {
    p_supplier_id?: string | null;
    p_note?: string | null;
    p_items: any;
  }
) {
  const items = typeof params.p_items === "string" ? JSON.parse(params.p_items) : params.p_items;
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Pembelian harus punya minimal satu item");
  }

  return await conn.begin(async (sql) => {
    const [purchase] = await sql`
      INSERT INTO public.purchases (supplier_id, note, total, kind, purchase_date, created_at)
      VALUES (
        ${params.p_supplier_id || null},
        ${params.p_note || null},
        0,
        'bahan',
        (now() AT TIME ZONE 'Asia/Jakarta')::date,
        now()
      )
      RETURNING id
    `;

    let total = 0;

    for (const item of items) {
      const productId = item.productId || item.product_id;
      const qty = Number(item.qty || item.quantity);
      const unitCost = Number(item.unitCost || item.unit_cost || 0);

      if (!qty || qty <= 0) {
        throw new Error(`Qty tidak valid untuk produk ${productId}`);
      }

      const [prod] = await sql`SELECT name FROM public.products WHERE id = ${productId}`;
      if (!prod) {
        throw new Error(`Produk ${productId} tidak ditemukan`);
      }

      const lineSubtotal = qty * unitCost;
      total += lineSubtotal;

      await sql`
        INSERT INTO public.purchase_items (
          purchase_id, product_id, product_name, quantity, unit_cost, subtotal
        ) VALUES (
          ${purchase.id}, ${productId}, ${prod.name}, ${qty}, ${unitCost}, ${lineSubtotal}
        )
      `;

      await sql`
        INSERT INTO public.inventory_logs (product_id, qty_change, reason)
        VALUES (${productId}, ${qty}, 'Pembelian')
      `;

      await sql`
        UPDATE public.products
        SET stock_qty = stock_qty + ${qty}
        WHERE id = ${productId}
      `;
    }

    await sql`
      UPDATE public.purchases
      SET total = ${total}
      WHERE id = ${purchase.id}
    `;

    return [{
      purchase_id: purchase.id,
      total,
    }];
  });
}
