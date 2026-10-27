import type { Sql } from "postgres";

export async function dailySalary(
  conn: Sql,
  params: {
    p_date: string;
  }
) {
  const rows = await conn`
    SELECT COALESCE(sum(e.daily_wage), 0)::numeric AS total, count(*)::int AS employee_count
    FROM (
      SELECT DISTINCT emp_id
      FROM public.shift_schedules ss, unnest(ss.employee_ids) AS emp_id
      WHERE ss.work_date = ${params.p_date}::date
    ) d
    JOIN public.employees e ON e.id = d.emp_id
  `;

  return rows;
}

export async function recordDailySalary(
  conn: Sql,
  params: {
    p_date: string;
  }
) {
  return await conn.begin(async (sql) => {
    const [calc] = await sql`
      SELECT COALESCE(sum(e.daily_wage), 0)::numeric AS total, count(*)::int AS employee_count
      FROM (
        SELECT DISTINCT emp_id
        FROM public.shift_schedules ss, unnest(ss.employee_ids) AS emp_id
        WHERE ss.work_date = ${params.p_date}::date
      ) d
      JOIN public.employees e ON e.id = d.emp_id
    `;

    const total = Number(calc?.total || 0);
    const count = Number(calc?.employee_count || 0);

    await sql`
      DELETE FROM public.purchases
      WHERE purchase_date = ${params.p_date}::date AND kind = 'gaji'
    `;

    if (total > 0) {
      await sql`
        INSERT INTO public.purchases (purchase_date, total, note, kind, created_at)
        VALUES (
          ${params.p_date}::date,
          ${total},
          ${`Gaji karyawan (${count} orang)`},
          'gaji',
          now()
        )
      `;
    }

    return [{
      total,
      employee_count: count,
    }];
  });
}
