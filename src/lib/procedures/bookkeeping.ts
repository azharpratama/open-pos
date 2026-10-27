import type { Sql } from "postgres";

export async function bookkeepingReport(
  conn: Sql,
  params: {
    p_start: string;
    p_end: string;
  }
) {
  const rows = await conn`
    WITH o AS (
      SELECT subtotal, discount, total_amount, payment_method
      FROM public.orders
      WHERE payment_status IN ('SUCCESS', 'DEPOSIT', 'REFUNDED')
        AND ((created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Jakarta')::date
            BETWEEN ${params.p_start}::date AND ${params.p_end}::date
    ),
    p AS (
      SELECT total, kind
      FROM public.purchases
      WHERE purchase_date BETWEEN ${params.p_start}::date AND ${params.p_end}::date
    )
    SELECT
      COALESCE((SELECT sum(subtotal) FROM o), 0)::numeric AS revenue_gross,
      COALESCE((SELECT sum(discount) FROM o), 0)::numeric AS discount_total,
      COALESCE((SELECT sum(total_amount) FROM o), 0)::numeric AS revenue_net,
      COALESCE((SELECT sum(total_amount) FROM o WHERE payment_method = 'TUNAI'), 0)::numeric AS revenue_tunai,
      COALESCE((SELECT sum(total_amount) FROM o WHERE payment_method = 'QRIS'), 0)::numeric AS revenue_qris,
      COALESCE((SELECT sum(total_amount) FROM o WHERE payment_method = 'TRANSFER'), 0)::numeric AS revenue_transfer,
      COALESCE((SELECT count(*) FROM o), 0)::int AS tx_count,
      COALESCE((SELECT sum(total) FROM p WHERE kind = 'bahan'), 0)::numeric AS cogs,
      COALESCE((SELECT sum(total) FROM p WHERE kind = 'gaji'), 0)::numeric AS salary,
      COALESCE((SELECT sum(total) FROM p WHERE kind NOT IN ('bahan', 'gaji')), 0)::numeric AS other_expense
  `;

  return rows;
}

export async function cashBook(
  conn: Sql,
  params: {
    p_start: string;
    p_end: string;
  }
) {
  const rows = await conn`
    WITH entries AS (
      SELECT
        ((created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Jakarta')::date AS entry_date,
        (created_at AT TIME ZONE 'UTC')                                     AS entry_time,
        order_ref                                                           AS ref,
        'Penjualan · ' || COALESCE(nullif(customer_name, ''), 'Pelanggan')  AS description,
        'Penjualan'::text                                                   AS category,
        total_amount                                                        AS cash_in,
        0::numeric                                                          AS cash_out
      FROM public.orders
      WHERE payment_status IN ('SUCCESS', 'DEPOSIT', 'REFUNDED')
        AND ((created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Jakarta')::date
            BETWEEN ${params.p_start}::date AND ${params.p_end}::date

      UNION ALL

      SELECT
        p.purchase_date AS entry_date,
        p.created_at AS entry_time,
        null::text AS ref,
        CASE p.kind
          WHEN 'gaji'   THEN COALESCE(nullif(p.note, ''), 'Pembayaran gaji karyawan')
          WHEN 'refund' THEN COALESCE(nullif(p.note, ''), 'Refund / Pembatalan')
          WHEN 'bahan'  THEN 'Pembelian: '
            || COALESCE(
                 (
                   SELECT string_agg(
                            trim_scale(pi.quantity)::text || '× '
                              || COALESCE(nullif(pi.product_name, ''), 'Bahan'),
                            ', ' ORDER BY pi.created_at, pi.id
                          )
                   FROM public.purchase_items pi
                   WHERE pi.purchase_id = p.id
                 ),
                 'bahan baku'
               )
            || COALESCE(' — ' || nullif(p.note, ''), '')
          ELSE COALESCE(nullif(p.note, ''), 'Pengeluaran lain-lain')
        END AS description,
        CASE p.kind
          WHEN 'gaji'   THEN 'Beban Gaji'
          WHEN 'refund' THEN 'Refund / Pembatalan'
          WHEN 'bahan'  THEN 'Pembelian Bahan Baku (HPP)'
          ELSE 'Beban Lain-lain'
        END AS category,
        0::numeric AS cash_in,
        p.total AS cash_out
      FROM public.purchases p
      WHERE p.purchase_date BETWEEN ${params.p_start}::date AND ${params.p_end}::date
    )
    SELECT
      entry_date, entry_time, ref, description, category, cash_in, cash_out,
      sum(cash_in - cash_out) OVER (
        ORDER BY entry_time
        ROWS BETWEEN unbounded preceding AND current row
      ) AS balance
    FROM entries
    ORDER BY entry_time ASC
  `;

  return rows;
}
