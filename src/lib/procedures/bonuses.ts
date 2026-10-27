import type { Sql } from "postgres";

export async function consumeBonus(
  conn: Sql,
  params: {
    p_bonus_id: string;
    p_qty: number;
  }
) {
  const qty = Number(params.p_qty);
  if (!qty || qty <= 0) {
    throw new Error("Qty tidak valid");
  }

  return await conn.begin(async (sql) => {
    const [bonus] = await sql`
      SELECT product_id, remaining
      FROM public.employee_bonuses
      WHERE id = ${params.p_bonus_id}
      FOR UPDATE
    `;

    if (!bonus) {
      throw new Error("Bonus tidak ditemukan");
    }

    const curRemaining = Number(bonus.remaining || 0);
    if (curRemaining < qty) {
      throw new Error(`Sisa jatah tidak cukup (sisa ${curRemaining})`);
    }

    const productId = bonus.product_id;
    const ingredients = await sql`
      SELECT ingredient_product_id, quantity
      FROM public.menu_ingredients
      WHERE menu_product_id = ${productId}
    `;

    let finalStock = 0;

    if (ingredients.length > 0) {
      for (const ing of ingredients) {
        const [ingProd] = await sql`
          SELECT stock_qty, name
          FROM public.products
          WHERE id = ${ing.ingredient_product_id}
          FOR UPDATE
        `;

        const needed = Number(ing.quantity) * qty;
        const curStock = Number(ingProd?.stock_qty || 0);
        if (curStock < needed) {
          throw new Error(`Stok bahan "${ingProd?.name}" tidak cukup (butuh ${needed}, tersisa ${curStock})`);
        }

        await sql`
          INSERT INTO public.inventory_logs (product_id, qty_change, reason)
          VALUES (${ing.ingredient_product_id}, ${-needed}, 'Bonus Karyawan')
        `;

        await sql`
          UPDATE public.products
          SET stock_qty = stock_qty - ${needed}
          WHERE id = ${ing.ingredient_product_id}
        `;
      }
    } else {
      const [prod] = await sql`
        SELECT stock_qty
        FROM public.products
        WHERE id = ${productId}
        FOR UPDATE
      `;

      finalStock = Number(prod?.stock_qty || 0) - qty;

      await sql`
        INSERT INTO public.inventory_logs (product_id, qty_change, reason)
        VALUES (${productId}, ${-qty}, 'Bonus Karyawan')
      `;

      await sql`
        UPDATE public.products
        SET stock_qty = ${finalStock}
        WHERE id = ${productId}
      `;
    }

    const newRemaining = curRemaining - qty;
    await sql`
      UPDATE public.employee_bonuses
      SET remaining = ${newRemaining}
      WHERE id = ${params.p_bonus_id}
    `;

    return [{
      remaining: newRemaining,
      stock: finalStock,
    }];
  });
}
