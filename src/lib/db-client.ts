import { procedures } from "@/lib/procedures";
import { conn } from "@/db";
import { hashPassword } from "@/lib/auth";

export type DbRow = Record<string, any>;

export interface QueryResult<T = DbRow[]> {
  data: T;
  error: { message: string; code?: string } | null;
}

// A stopped local Postgres surfaces as a raw TCP error, which reads like an app
// bug in the UI. Say what to do instead.
export function describeDbError(err: any): { message: string; code?: string } {
  const message = err?.message || String(err);
  if ((err?.code === "ECONNREFUSED" || message.includes("ECONNREFUSED")) && message.includes("5432")) {
    return {
      message:
        "Database lokal belum berjalan di port 5432. Jalankan `brew services start postgresql@18`, atau set DEMO_MODE=true untuk memakai sandbox.",
      code: err?.code,
    };
  }
  return { message, code: err?.code };
}

export interface QueryBuilder<T = DbRow[]> extends PromiseLike<QueryResult<T>> {
  select: (cols?: string) => QueryBuilder<DbRow[]>;
  insert: (data: any) => QueryBuilder<any>;
  update: (data: any) => QueryBuilder<any>;
  delete: () => QueryBuilder<DbRow[]>;
  upsert: (data: any, options?: any) => QueryBuilder<any>;
  eq: (col: string, val: any) => QueryBuilder<T>;
  in: (col: string, vals: any[]) => QueryBuilder<T>;
  gte: (col: string, val: any) => QueryBuilder<T>;
  lte: (col: string, val: any) => QueryBuilder<T>;
  gt: (col: string, val: any) => QueryBuilder<T>;
  lt: (col: string, val: any) => QueryBuilder<T>;
  is: (col: string, val: any) => QueryBuilder<T>;
  not: (col: string, op: string, val: any) => QueryBuilder<T>;
  order: (col: string, options?: { ascending?: boolean }) => QueryBuilder<T>;
  limit: (n: number) => QueryBuilder<T>;
  range: (from: number, to: number) => QueryBuilder<T>;
  single: () => QueryBuilder<DbRow>;
  maybeSingle: () => QueryBuilder<DbRow | null>;
  then<TResult1 = QueryResult<T>, TResult2 = never>(
    onfulfilled?: ((value: QueryResult<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2>;
}

export function createDbClient() {
  return {
    rpc: async (fnName: string, args: Record<string, any> = {}): Promise<{ data: any; error: any }> => {
      try {
        if (procedures[fnName]) {
          const data = await procedures[fnName](conn, args);
          return { data, error: null };
        }

        const keys = Object.keys(args);
        let queryStr = "";
        const values: any[] = [];

        if (keys.length === 0) {
          queryStr = `SELECT * FROM public.${fnName}()`;
        } else {
          const paramsList = keys.map((k, idx) => {
            values.push(args[k]);
            return `$${idx + 1}`;
          });
          queryStr = `SELECT * FROM public.${fnName}(${paramsList.join(", ")})`;
        }

        const rows = await conn.unsafe(queryStr, values);
        if (!rows || rows.length === 0) {
          return { data: null, error: null };
        }
        if (rows[0] && fnName in rows[0] && Object.keys(rows[0]).length === 1) {
          return { data: rows[0][fnName], error: null };
        }
        return { data: rows, error: null };
      } catch (err: any) {
        return { data: null, error: describeDbError(err) };
      }
    },

    from: (table: string): QueryBuilder => {
      let operation: "select" | "insert" | "update" | "delete" | "upsert" = "select";
      let selectCols = "*";
      let insertData: any = null;
      let updateData: any = null;
      const conditions: string[] = [];
      const params: any[] = [];
      let orderClause = "";
      let limitClause = "";
      let isSingle = false;
      let isMaybeSingle = false;

      async function execute(): Promise<QueryResult<any[]>> {
        try {
          let sql = "";
          const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

          if (operation === "select") {
            let parsedCols = selectCols;
            if (selectCols.includes("suppliers(name)") || selectCols.includes("order_items(") || selectCols.includes("menu_ingredients(")) {
              parsedCols = "*";
            }

            sql = `SELECT ${parsedCols} FROM public."${table}" ${whereClause} ${orderClause} ${limitClause}`;
            const rows: any = await conn.unsafe(sql, params);

            if (selectCols.includes("suppliers(name)") && rows.length > 0) {
              const supplierIds = Array.from(new Set(rows.map((r: any) => r.supplier_id).filter(Boolean)));
              if (supplierIds.length > 0) {
                const sups = await conn.unsafe(`SELECT id, name FROM public.suppliers WHERE id = ANY($1)`, [supplierIds as any]);
                const supMap = new Map(sups.map((s: any) => [s.id, s]));
                for (const r of rows) {
                  r.suppliers = r.supplier_id ? supMap.get(r.supplier_id) || null : null;
                }
              }
            }

            if (selectCols.includes("order_items(") && rows.length > 0) {
              const orderIds = rows.map((r: any) => r.id);
              const items = await conn.unsafe(`SELECT * FROM public.order_items WHERE order_id = ANY($1)`, [orderIds as any]);
              const itemMap = new Map<string, any[]>();
              for (const it of items) {
                if (!itemMap.has(it.order_id)) itemMap.set(it.order_id, []);
                itemMap.get(it.order_id)!.push(it);
              }
              for (const r of rows) {
                r.order_items = itemMap.get(r.id) || [];
              }
            }

            if (selectCols.includes("menu_ingredients(") && rows.length > 0) {
              const prodIds = rows.map((r: any) => r.id);
              const ings = await conn.unsafe(`SELECT * FROM public.menu_ingredients WHERE menu_product_id = ANY($1)`, [prodIds as any]);
              const ingMap = new Map<string, any[]>();
              for (const ing of ings) {
                if (!ingMap.has(ing.menu_product_id)) ingMap.set(ing.menu_product_id, []);
                ingMap.get(ing.menu_product_id)!.push(ing);
              }
              for (const r of rows) {
                r.menu_ingredients = ingMap.get(r.id) || [];
              }
            }

            if (isSingle) {
              if (rows.length === 0) {
                return { data: null as any, error: { message: "Row not found", code: "PGRST116" } };
              }
              return { data: rows[0] as any, error: null };
            }
            if (isMaybeSingle) {
              return { data: (rows[0] || null) as any, error: null };
            }
            return { data: rows, error: null };
          }

          if (operation === "insert") {
            const items = Array.isArray(insertData) ? insertData : [insertData];
            if (items.length === 0) return { data: [], error: null };

            const keys = Object.keys(items[0]);
            const colNames = keys.map((k) => `"${k}"`).join(", ");
            const rowValuesList: string[] = [];
            const insertParams: any[] = [];

            for (const item of items) {
              const rowPlaceholders = keys.map((k) => {
                insertParams.push(item[k]);
                return `$${insertParams.length}`;
              });
              rowValuesList.push(`(${rowPlaceholders.join(", ")})`);
            }

            sql = `INSERT INTO public."${table}" (${colNames}) VALUES ${rowValuesList.join(", ")} RETURNING *`;
            const rows: any = await conn.unsafe(sql, insertParams);
            const data = Array.isArray(insertData) ? rows : rows[0];
            return { data, error: null };
          }

          if (operation === "update") {
            const keys = Object.keys(updateData);
            if (keys.length === 0) return { data: null as any, error: null };

            const updateParams: any[] = [];
            const setAssignments = keys.map((k) => {
              updateParams.push(updateData[k]);
              return `"${k}" = $${updateParams.length}`;
            });

            const offset = updateParams.length;
            const shiftedConditions = conditions.map((c) => {
              return c.replace(/\$([0-9]+)/g, (_, num) => `$${parseInt(num, 10) + offset}`);
            });
            const finalParams = [...updateParams, ...params];
            const finalWhere = shiftedConditions.length > 0 ? `WHERE ${shiftedConditions.join(" AND ")}` : "";

            sql = `UPDATE public."${table}" SET ${setAssignments.join(", ")} ${finalWhere} RETURNING *`;
            const rows: any = await conn.unsafe(sql, finalParams);
            return { data: rows[0] || rows, error: null };
          }

          if (operation === "delete") {
            sql = `DELETE FROM public."${table}" ${whereClause} RETURNING *`;
            const rows: any = await conn.unsafe(sql, params);
            return { data: rows, error: null };
          }

          if (operation === "upsert") {
            const items = Array.isArray(insertData) ? insertData : [insertData];
            if (items.length === 0) return { data: [], error: null };

            const keys = Object.keys(items[0]);
            const colNames = keys.map((k) => `"${k}"`).join(", ");
            const insertParams: any[] = [];
            const rowPlaceholders = keys.map((k) => {
              insertParams.push(items[0][k]);
              return `$${insertParams.length}`;
            });

            const updateSets = keys
              .filter((k) => k !== "id")
              .map((k) => `"${k}" = EXCLUDED."${k}"`)
              .join(", ");

            sql = `INSERT INTO public."${table}" (${colNames}) VALUES (${rowPlaceholders.join(", ")}) 
                   ON CONFLICT (id) DO UPDATE SET ${updateSets} RETURNING *`;
            const rows: any = await conn.unsafe(sql, insertParams);
            return { data: rows[0] || rows, error: null };
          }

          return { data: null as any, error: null };
        } catch (err: any) {
          return { data: null as any, error: describeDbError(err) };
        }
      }

      const builder: QueryBuilder = {
        select: (cols: string = "*") => {
          selectCols = cols;
          return builder;
        },
        insert: (data: any) => {
          operation = "insert";
          insertData = data;
          return builder;
        },
        update: (data: any) => {
          operation = "update";
          updateData = data;
          return builder;
        },
        delete: () => {
          operation = "delete";
          return builder;
        },
        upsert: (data: any, options?: any) => {
          operation = "upsert";
          insertData = data;
          return builder;
        },
        eq: (col: string, val: any) => {
          params.push(val);
          conditions.push(`"${col}" = $${params.length}`);
          return builder;
        },
        in: (col: string, vals: any[]) => {
          if (!vals || vals.length === 0) {
            conditions.push("false");
          } else {
            params.push(vals);
            conditions.push(`"${col}" = ANY($${params.length})`);
          }
          return builder;
        },
        gte: (col: string, val: any) => {
          params.push(val);
          conditions.push(`"${col}" >= $${params.length}`);
          return builder;
        },
        lte: (col: string, val: any) => {
          params.push(val);
          conditions.push(`"${col}" <= $${params.length}`);
          return builder;
        },
        gt: (col: string, val: any) => {
          params.push(val);
          conditions.push(`"${col}" > $${params.length}`);
          return builder;
        },
        lt: (col: string, val: any) => {
          params.push(val);
          conditions.push(`"${col}" < $${params.length}`);
          return builder;
        },
        is: (col: string, val: any) => {
          if (val === null) {
            conditions.push(`"${col}" IS NULL`);
          } else {
            params.push(val);
            conditions.push(`"${col}" IS $${params.length}`);
          }
          return builder;
        },
        not: (col: string, op: string, val: any) => {
          if (op === "is" && val === null) {
            conditions.push(`"${col}" IS NOT NULL`);
          } else {
            params.push(val);
            conditions.push(`NOT ("${col}" = $${params.length})`);
          }
          return builder;
        },
        order: (col: string, options: { ascending?: boolean } = { ascending: true }) => {
          const dir = options.ascending === false ? "DESC" : "ASC";
          orderClause = `ORDER BY "${col}" ${dir}`;
          return builder;
        },
        limit: (n: number) => {
          limitClause = `LIMIT ${n}`;
          return builder;
        },
        range: (from: number, to: number) => {
          const limit = to - from + 1;
          limitClause = `LIMIT ${limit} OFFSET ${from}`;
          return builder;
        },
        single: () => {
          isSingle = true;
          limitClause = "LIMIT 1";
          return builder;
        },
        maybeSingle: () => {
          isMaybeSingle = true;
          limitClause = "LIMIT 1";
          return builder;
        },

        then: (onfulfilled?: any, onrejected?: any) => {
          return execute().then(onfulfilled, onrejected);
        },
      };

      return builder;
    },

    storage: {
      from: () => ({
        upload: async () => ({ error: null }),
        getPublicUrl: (path: string) => ({ data: { publicUrl: `/uploads/${path}` } }),
      }),
    },

    auth: {
      admin: {
        updateUserById: async (id: string, attributes: { password?: string }) => {
          try {
            if (attributes.password) {
              const hash = hashPassword(attributes.password);
              await conn`UPDATE public.users SET password_hash = ${hash} WHERE id = ${id}`;
            }
            return { error: null };
          } catch (err: any) {
            return { error: describeDbError(err) };
          }
        },
        listUsers: async () => ({ data: { users: [] as any[] }, error: null }),
      },
    },
  };
}

export const createAdminClient = createDbClient;
