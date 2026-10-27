import type { Sql } from "postgres";

export async function dashboardSummary(conn: Sql) {
  const rows = await conn`
    WITH b AS (
      SELECT
        ((now() AT TIME ZONE 'Asia/Jakarta') - interval '2 hours')::date AS d_today,
        date_trunc('week', ((now() AT TIME ZONE 'Asia/Jakarta') - interval '2 hours')::date)::date AS d_week,
        date_trunc('month', ((now() AT TIME ZONE 'Asia/Jakarta') - interval '2 hours')::date)::date AS d_month
    ),
    o AS (
      SELECT total_amount,
        (((created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Jakarta') - interval '2 hours')::date AS wdate
      FROM public.orders WHERE payment_status = 'SUCCESS'
    )
    SELECT
      COALESCE((SELECT sum(total_amount) FROM o, b WHERE o.wdate = b.d_today), 0)::numeric AS revenue_today,
      COALESCE((SELECT sum(total_amount) FROM o, b WHERE o.wdate >= b.d_week), 0)::numeric AS revenue_week,
      COALESCE((SELECT sum(total_amount) FROM o, b WHERE o.wdate >= b.d_month), 0)::numeric AS revenue_month,
      COALESCE((SELECT sum(total) FROM public.purchases p, b WHERE p.purchase_date = b.d_today), 0)::numeric AS expense_today,
      COALESCE((SELECT sum(total) FROM public.purchases p, b WHERE p.purchase_date >= b.d_week), 0)::numeric AS expense_week,
      COALESCE((SELECT sum(total) FROM public.purchases p, b WHERE p.purchase_date >= b.d_month), 0)::numeric AS expense_month,
      COALESCE((SELECT count(*) FROM o, b WHERE o.wdate = b.d_today), 0)::int AS tx_today
  `;

  return rows;
}

export async function revenueLastDays(
  conn: Sql,
  params: {
    p_days?: number;
  }
) {
  const daysCount = params.p_days || 7;
  const rows = await conn`
    WITH days AS (
      SELECT generate_series(
        ((now() AT TIME ZONE 'Asia/Jakarta') - interval '2 hours')::date - (${daysCount} - 1),
        ((now() AT TIME ZONE 'Asia/Jakarta') - interval '2 hours')::date,
        interval '1 day'
      )::date AS day
    ),
    o AS (
      SELECT total_amount,
        (((created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Jakarta') - interval '2 hours')::date AS wdate
      FROM public.orders WHERE payment_status = 'SUCCESS'
    )
    SELECT d.day::text, COALESCE(sum(o.total_amount), 0)::numeric AS revenue
    FROM days d LEFT JOIN o ON o.wdate = d.day
    GROUP BY d.day ORDER BY d.day
  `;

  return rows;
}

export async function revenueTrend(
  conn: Sql,
  params: {
    p_granularity?: string;
    p_buckets?: number;
  }
) {
  const granularity = params.p_granularity || "daily";
  const bucketsCount = params.p_buckets || 14;

  const rows = await conn`
    WITH cfg AS (
      SELECT
        ((now() AT TIME ZONE 'Asia/Jakarta') - interval '2 hours')::date AS today_op,
        CASE ${granularity}
          WHEN 'weekly' THEN interval '1 week'
          WHEN 'monthly' THEN interval '1 month'
          ELSE interval '1 day'
        END AS step,
        GREATEST(COALESCE(${bucketsCount}, 14), 1) AS n
    ),
    anchor AS (
      SELECT
        CASE ${granularity}
          WHEN 'weekly' THEN date_trunc('week', today_op)::date
          WHEN 'monthly' THEN date_trunc('month', today_op)::date
          ELSE today_op
        END AS end_bucket,
        step, n
      FROM cfg
    ),
    buckets AS (
      SELECT generate_series(
        (end_bucket::timestamp - step * (n - 1)),
        end_bucket::timestamp,
        step
      )::date AS bucket
      FROM anchor
    ),
    o AS (
      SELECT total_amount,
        CASE ${granularity}
          WHEN 'weekly' THEN date_trunc('week', (((created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Jakarta') - interval '2 hours')::date)::date
          WHEN 'monthly' THEN date_trunc('month', (((created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Jakarta') - interval '2 hours')::date)::date
          ELSE (((created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Jakarta') - interval '2 hours')::date
        END AS obucket
      FROM public.orders WHERE payment_status = 'SUCCESS'
    )
    SELECT b.bucket::text, COALESCE(sum(o.total_amount), 0)::numeric AS value, COALESCE(sum(o.total_amount), 0)::numeric AS revenue
    FROM buckets b
    LEFT JOIN o ON o.obucket = b.bucket
    GROUP BY b.bucket
    ORDER BY b.bucket
  `;

  return rows;
}

export async function expenseTrend(
  conn: Sql,
  params: {
    p_granularity?: string;
    p_buckets?: number;
  }
) {
  const granularity = params.p_granularity || "daily";
  const bucketsCount = params.p_buckets || 14;

  const rows = await conn`
    WITH cfg AS (
      SELECT
        ((now() AT TIME ZONE 'Asia/Jakarta') - interval '2 hours')::date AS today_op,
        CASE ${granularity}
          WHEN 'weekly' THEN interval '1 week'
          WHEN 'monthly' THEN interval '1 month'
          ELSE interval '1 day'
        END AS step,
        GREATEST(COALESCE(${bucketsCount}, 14), 1) AS n
    ),
    anchor AS (
      SELECT
        CASE ${granularity}
          WHEN 'weekly' THEN date_trunc('week', today_op)::date
          WHEN 'monthly' THEN date_trunc('month', today_op)::date
          ELSE today_op
        END AS end_bucket,
        step, n
      FROM cfg
    ),
    buckets AS (
      SELECT generate_series(
        (end_bucket::timestamp - step * (n - 1)),
        end_bucket::timestamp,
        step
      )::date AS bucket
      FROM anchor
    ),
    p AS (
      SELECT total,
        CASE ${granularity}
          WHEN 'weekly' THEN date_trunc('week', purchase_date)::date
          WHEN 'monthly' THEN date_trunc('month', purchase_date)::date
          ELSE purchase_date
        END AS pbucket
      FROM public.purchases
    )
    SELECT b.bucket::text, COALESCE(sum(p.total), 0)::numeric AS value, COALESCE(sum(p.total), 0)::numeric AS expense
    FROM buckets b
    LEFT JOIN p ON p.pbucket = b.bucket
    GROUP BY b.bucket
    ORDER BY b.bucket
  `;

  return rows;
}

export async function shiftRevenueRecap(
  conn: Sql,
  params: {
    p_days?: number;
  } = {}
) {
  const daysCount = params.p_days || 14;

  const rows = await conn`
    WITH o AS (
      SELECT
        total_amount,
        ((created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Jakarta') AS wib
      FROM public.orders
      WHERE payment_status = 'SUCCESS'
    ),
    ob AS (
      SELECT
        (wib - interval '2 hours')::date AS op_date,
        CASE
          WHEN extract(hour FROM wib) >= 9 AND extract(hour FROM wib) < 17 THEN 'SIANG'
          WHEN extract(hour FROM wib) >= 2 AND extract(hour FROM wib) < 9 THEN 'LUAR'
          ELSE 'MALAM'
        END AS win,
        total_amount
      FROM o
    ),
    rev AS (
      SELECT
        op_date,
        COALESCE(sum(total_amount) filter (WHERE win = 'SIANG'), 0)::numeric AS siang,
        COALESCE(sum(total_amount) filter (WHERE win = 'MALAM'), 0)::numeric AS malam,
        COALESCE(sum(total_amount) filter (WHERE win = 'LUAR'), 0)::numeric AS luar,
        COALESCE(sum(total_amount), 0)::numeric AS total
      FROM ob
      GROUP BY op_date
    ),
    sh AS (
      SELECT
        ((opened_at AT TIME ZONE 'Asia/Jakarta') - interval '2 hours')::date AS op_date,
        CASE WHEN extract(hour FROM (opened_at AT TIME ZONE 'Asia/Jakarta')) >= 9
              AND extract(hour FROM (opened_at AT TIME ZONE 'Asia/Jakarta')) < 17
             THEN 'SIANG' ELSE 'MALAM' END AS win
      FROM public.shifts
      WHERE closed_at IS NULL
    ),
    run AS (
      SELECT
        op_date,
        bool_or(win = 'SIANG') AS siang_running,
        bool_or(win = 'MALAM') AS malam_running
      FROM sh
      GROUP BY op_date
    ),
    base AS (
      SELECT
        COALESCE(rev.op_date, run.op_date) AS op_date,
        COALESCE(rev.siang, 0)::numeric AS siang,
        COALESCE(rev.malam, 0)::numeric AS malam,
        COALESCE(rev.luar, 0)::numeric AS luar,
        COALESCE(rev.total, 0)::numeric AS total,
        COALESCE(run.siang_running, false) AS siang_running,
        COALESCE(run.malam_running, false) AS malam_running
      FROM rev
      FULL OUTER JOIN run ON run.op_date = rev.op_date
    ),
    sched AS (
      SELECT ss.work_date AS op_date, ss.shift_type AS win, eid AS emp_id
      FROM public.shift_schedules ss
      CROSS JOIN LATERAL unnest(ss.employee_ids) AS eid
    ),
    names AS (
      SELECT sched.op_date, sched.win,
        array_agg(DISTINCT e.name ORDER BY e.name) AS names
      FROM sched
      JOIN public.employees e ON e.id = sched.emp_id
      GROUP BY sched.op_date, sched.win
    )
    SELECT
      base.op_date::text AS op_date,
      base.siang,
      base.malam,
      base.luar,
      base.total,
      base.siang_running,
      base.malam_running,
      COALESCE(ns.names, array[]::text[]) AS siang_names,
      COALESCE(nm.names, array[]::text[]) AS malam_names
    FROM base
    LEFT JOIN names ns ON ns.op_date = base.op_date AND ns.win = 'SIANG'
    LEFT JOIN names nm ON nm.op_date = base.op_date AND nm.win = 'MALAM'
    WHERE base.op_date
          >= (((now() AT TIME ZONE 'Asia/Jakarta') - interval '2 hours')::date - (GREATEST(${daysCount}, 1) - 1))
    ORDER BY base.op_date DESC
  `;

  return rows;
}
