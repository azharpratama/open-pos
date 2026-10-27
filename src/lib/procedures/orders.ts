import type { Sql } from "postgres";

export async function createOrderTransaction(
  conn: Sql,
  params: {
    p_order_ref: string;
    p_cashier_name: string;
    p_customer_name: string;
    p_order_type: string;
    p_table_number?: number | null;
    p_note?: string | null;
    p_payment_method?: string | null;
    p_amount_paid?: number | null;
    p_change_amount?: number | null;
    p_items: any;
    p_discount?: number | null;
    p_is_open_bill?: boolean | null;
    p_reservation_id?: string | null;
  }
) {
  const items = typeof params.p_items === "string" ? JSON.parse(params.p_items) : params.p_items;
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Order must have at least one item");
  }

  const orderType = params.p_order_type;
  if (orderType !== "DINE_IN" && orderType !== "TAKEAWAY") {
    throw new Error(`Invalid order_type: ${orderType}`);
  }

  const isOpenBill = Boolean(params.p_is_open_bill);
  const paymentMethod = params.p_payment_method ?? null;
  if (!isOpenBill) {
    if (!paymentMethod || !["TUNAI", "QRIS", "TRANSFER"].includes(paymentMethod)) {
      throw new Error(`Invalid payment_method: ${paymentMethod}`);
    }
  }

  return await conn.begin(async (sql) => {
    let subtotal = 0;

    for (const item of items) {
      const productId = item.productId || item.product_id;
      const qty = Number(item.qty || item.quantity);
      if (!qty || qty <= 0) {
        throw new Error(`Invalid quantity for product ${productId}`);
      }

      const [prod] = await sql`SELECT price, name FROM public.products WHERE id = ${productId}`;
      if (!prod) {
        throw new Error(`Product ${productId} not found`);
      }
      subtotal += Number(prod.price || 0) * qty;
    }

    const discountInput = Number(params.p_discount || 0);
    const discount = Math.min(Math.max(discountInput, 0), subtotal);
    const total = subtotal - discount;

    let paymentStatus = "SUCCESS";
    if (isOpenBill) {
      paymentStatus = "PENDING";
    } else if (params.p_reservation_id) {
      paymentStatus = "DEPOSIT";
    }

    const [order] = await sql`
      INSERT INTO public.orders (
        order_ref, cashier_name, customer_name, order_type, table_number, note,
        subtotal, tax, total_amount, discount, payment_method, payment_status,
        order_status, amount_paid, change_amount, is_open_bill, reservation_id
      ) VALUES (
        ${params.p_order_ref}, ${params.p_cashier_name}, ${params.p_customer_name}, ${orderType},
        ${params.p_table_number ?? null}, ${params.p_note ?? null},
        ${subtotal}, 0, ${total}, ${discount},
        ${isOpenBill ? null : paymentMethod},
        ${paymentStatus}, 'ANTRIAN',
        ${params.p_amount_paid ?? 0}, ${params.p_change_amount ?? 0}, ${isOpenBill},
        ${params.p_reservation_id ?? null}
      )
      RETURNING id
    `;

    for (const item of items) {
      const productId = item.productId || item.product_id;
      const qty = Number(item.qty || item.quantity);
      const [prod] = await sql`SELECT name, price FROM public.products WHERE id = ${productId}`;
      const lineSubtotal = Number(prod.price || 0) * qty;

      await sql`
        INSERT INTO public.order_items (
          order_id, product_id, product_name, quantity, unit_price, subtotal_price, modifier
        ) VALUES (
          ${order.id}, ${productId}, ${prod.name}, ${qty}, ${prod.price}, ${lineSubtotal},
          ${item.modifier || null}
        )
      `;

      const ingredients = await sql`
        SELECT ingredient_product_id, quantity
        FROM public.menu_ingredients
        WHERE menu_product_id = ${productId}
      `;

      if (ingredients.length > 0) {
        for (const ing of ingredients) {
          const [ingProd] = await sql`
            SELECT stock_qty, name
            FROM public.products
            WHERE id = ${ing.ingredient_product_id}
            FOR UPDATE
          `;

          const needed = Number(ing.quantity) * qty;
          const currentStock = Number(ingProd?.stock_qty || 0);
          if (currentStock < needed) {
            throw new Error(`Stok bahan "${ingProd?.name}" tidak cukup untuk "${prod.name}" (butuh ${needed}, tersisa ${currentStock})`);
          }

          await sql`
            INSERT INTO public.inventory_logs (product_id, qty_change, reason, order_id)
            VALUES (${ing.ingredient_product_id}, ${-needed}, 'Terjual', ${order.id})
          `;

          await sql`
            UPDATE public.products
            SET stock_qty = stock_qty - ${needed}
            WHERE id = ${ing.ingredient_product_id}
          `;
        }
      } else {
        await sql`
          INSERT INTO public.inventory_logs (product_id, qty_change, reason, order_id)
          VALUES (${productId}, ${-qty}, 'Terjual', ${order.id})
        `;

        await sql`
          UPDATE public.products
          SET stock_qty = stock_qty - ${qty}
          WHERE id = ${productId}
        `;
      }
    }

    if (params.p_reservation_id) {
      await sql`
        UPDATE public.reservations
        SET status = 'CHECKED_IN', order_id = ${order.id}
        WHERE id = ${params.p_reservation_id}
      `;
    }

    return [{
      order_id: order.id,
      order_ref: params.p_order_ref,
      subtotal,
      tax: 0,
      total,
    }];
  });
}

export async function addItemsToOrder(
  conn: Sql,
  params: {
    p_order_id: string;
    p_items: any;
  }
) {
  const items = typeof params.p_items === "string" ? JSON.parse(params.p_items) : params.p_items;
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Items must be a non-empty array");
  }

  return await conn.begin(async (sql) => {
    const [currentOrder] = await sql`
      SELECT subtotal, discount
      FROM public.orders
      WHERE id = ${params.p_order_id} AND (is_open_bill = true OR reservation_id IS NOT NULL)
      FOR UPDATE
    `;

    if (!currentOrder) {
      throw new Error("Order not found or is not an open bill/reservation");
    }

    const curSubtotal = Number(currentOrder.subtotal || 0);
    const curDiscount = Number(currentOrder.discount || 0);
    let addedSubtotal = 0;

    for (const item of items) {
      const productId = item.productId || item.product_id;
      const qty = Number(item.qty || item.quantity);
      const modifier = item.modifier || null;

      if (!qty || qty <= 0) {
        throw new Error(`Invalid quantity for product ${productId}`);
      }

      const [prod] = await sql`SELECT name, price FROM public.products WHERE id = ${productId}`;
      if (!prod) {
        throw new Error(`Product ${productId} not found`);
      }

      const lineSubtotal = Number(prod.price || 0) * qty;
      addedSubtotal += lineSubtotal;

      const [existingItem] = await sql`
        SELECT id
        FROM public.order_items
        WHERE order_id = ${params.p_order_id}
          AND product_id = ${productId}
          AND COALESCE(modifier, '') = COALESCE(${modifier}, '')
        LIMIT 1
      `;

      if (existingItem) {
        await sql`
          UPDATE public.order_items
          SET quantity = quantity + ${qty},
              subtotal_price = subtotal_price + ${lineSubtotal}
          WHERE id = ${existingItem.id}
        `;
      } else {
        await sql`
          INSERT INTO public.order_items (
            order_id, product_id, product_name, quantity, unit_price, subtotal_price, modifier
          ) VALUES (
            ${params.p_order_id}, ${productId}, ${prod.name}, ${qty}, ${prod.price}, ${lineSubtotal}, ${modifier}
          )
        `;
      }

      const ingredients = await sql`
        SELECT ingredient_product_id, quantity
        FROM public.menu_ingredients
        WHERE menu_product_id = ${productId}
      `;

      if (ingredients.length > 0) {
        for (const ing of ingredients) {
          const [ingProd] = await sql`
            SELECT stock_qty, name
            FROM public.products
            WHERE id = ${ing.ingredient_product_id}
            FOR UPDATE
          `;

          const needed = Number(ing.quantity) * qty;
          const currentStock = Number(ingProd?.stock_qty || 0);
          if (currentStock < needed) {
            throw new Error(`Stok bahan "${ingProd?.name}" tidak cukup untuk "${prod.name}" (butuh ${needed}, tersisa ${currentStock})`);
          }

          await sql`
            INSERT INTO public.inventory_logs (product_id, qty_change, reason, order_id)
            VALUES (${ing.ingredient_product_id}, ${-needed}, 'Terjual', ${params.p_order_id})
          `;

          await sql`
            UPDATE public.products
            SET stock_qty = stock_qty - ${needed}
            WHERE id = ${ing.ingredient_product_id}
          `;
        }
      } else {
        await sql`
          INSERT INTO public.inventory_logs (product_id, qty_change, reason, order_id)
          VALUES (${productId}, ${-qty}, 'Terjual', ${params.p_order_id})
        `;

        await sql`
          UPDATE public.products
          SET stock_qty = stock_qty - ${qty}
          WHERE id = ${productId}
        `;
      }
    }

    const newSubtotal = curSubtotal + addedSubtotal;
    const newTotal = newSubtotal - curDiscount;

    await sql`
      UPDATE public.orders
      SET subtotal = ${newSubtotal},
          total_amount = ${newTotal}
      WHERE id = ${params.p_order_id}
    `;

    return [{
      new_subtotal: newSubtotal,
      new_total: newTotal,
    }];
  });
}

export async function cancelOrderTransaction(
  conn: Sql,
  params: {
    p_order_id: string;
    p_cancellation_id: string;
  }
) {
  return await conn.begin(async (sql) => {
    const [order] = await sql`
      SELECT total_amount, order_ref, customer_name
      FROM public.orders
      WHERE id = ${params.p_order_id}
      FOR UPDATE
    `;

    if (!order) {
      throw new Error("Order not found");
    }

    await sql`
      UPDATE public.orders
      SET order_status = 'DIBATALKAN'
      WHERE id = ${params.p_order_id}
    `;

    const items = await sql`
      SELECT product_id, quantity
      FROM public.order_items
      WHERE order_id = ${params.p_order_id}
    `;

    for (const item of items) {
      const qty = Number(item.quantity);
      const ingredients = await sql`
        SELECT ingredient_product_id, quantity
        FROM public.menu_ingredients
        WHERE menu_product_id = ${item.product_id}
      `;

      if (ingredients.length > 0) {
        for (const ing of ingredients) {
          const restock = Number(ing.quantity) * qty;
          await sql`
            UPDATE public.products
            SET stock_qty = stock_qty + ${restock}
            WHERE id = ${ing.ingredient_product_id}
          `;

          await sql`
            INSERT INTO public.inventory_logs (product_id, qty_change, reason, order_id)
            VALUES (${ing.ingredient_product_id}, ${restock}, 'Pembatalan', ${params.p_order_id})
          `;
        }
      } else {
        await sql`
          UPDATE public.products
          SET stock_qty = stock_qty + ${qty}
          WHERE id = ${item.product_id}
        `;

        await sql`
          INSERT INTO public.inventory_logs (product_id, qty_change, reason, order_id)
          VALUES (${item.product_id}, ${qty}, 'Pembatalan', ${params.p_order_id})
        `;
      }
    }

    const orderTotal = Number(order.total_amount || 0);
    if (orderTotal > 0) {
      const customer = order.customer_name || "Pelanggan";
      const wibDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());

      await sql`
        INSERT INTO public.purchases (supplier_id, purchase_date, total, kind, note, created_at)
        VALUES (
          null,
          ${wibDate},
          ${orderTotal},
          'refund',
          ${`Refund · ${customer} · ${order.order_ref}`},
          now()
        )
      `;

      await sql`
        UPDATE public.orders
        SET payment_status = 'REFUNDED'
        WHERE id = ${params.p_order_id}
      `;
    }

    await sql`
      UPDATE public.cancellation_requests
      SET status = 'APPROVED', reviewed_at = now()
      WHERE id = ${params.p_cancellation_id}
    `;

    return [];
  });
}

export async function cancelOrderItems(
  conn: Sql,
  params: {
    p_order_id: string;
    p_item_ids: string[];
    p_cancellation_id: string;
  }
) {
  const itemIds = params.p_item_ids || [];

  return await conn.begin(async (sql) => {
    const [order] = await sql`
      SELECT discount, subtotal, total_amount
      FROM public.orders
      WHERE id = ${params.p_order_id}
      FOR UPDATE
    `;

    if (!order) {
      throw new Error("Order not found");
    }

    const items = await sql`
      SELECT id, product_id, quantity, subtotal_price
      FROM public.order_items
      WHERE order_id = ${params.p_order_id} AND id = ANY(${itemIds})
    `;

    let removedSubtotal = 0;

    for (const item of items) {
      removedSubtotal += Number(item.subtotal_price || 0);
      const qty = Number(item.quantity);

      const ingredients = await sql`
        SELECT ingredient_product_id, quantity
        FROM public.menu_ingredients
        WHERE menu_product_id = ${item.product_id}
      `;

      if (ingredients.length > 0) {
        for (const ing of ingredients) {
          const restock = Number(ing.quantity) * qty;
          await sql`
            UPDATE public.products
            SET stock_qty = stock_qty + ${restock}
            WHERE id = ${ing.ingredient_product_id}
          `;

          await sql`
            INSERT INTO public.inventory_logs (product_id, qty_change, reason, order_id)
            VALUES (${ing.ingredient_product_id}, ${restock}, 'Pembatalan Item', ${params.p_order_id})
          `;
        }
      } else {
        await sql`
          UPDATE public.products
          SET stock_qty = stock_qty + ${qty}
          WHERE id = ${item.product_id}
        `;

        await sql`
          INSERT INTO public.inventory_logs (product_id, qty_change, reason, order_id)
          VALUES (${item.product_id}, ${qty}, 'Pembatalan Item', ${params.p_order_id})
        `;
      }

      await sql`DELETE FROM public.order_items WHERE id = ${item.id}`;
    }

    const discount = Number(order.discount || 0);
    const newSubtotal = Number(order.subtotal || 0) - removedSubtotal;
    const newTotal = Math.max(newSubtotal - discount, 0);

    await sql`
      UPDATE public.orders
      SET subtotal = ${newSubtotal},
          total_amount = ${newTotal}
      WHERE id = ${params.p_order_id}
    `;

    await sql`
      UPDATE public.cancellation_requests
      SET status = 'APPROVED', reviewed_at = now()
      WHERE id = ${params.p_cancellation_id}
    `;

    return [{
      new_subtotal: newSubtotal,
      new_total: newTotal,
    }];
  });
}
