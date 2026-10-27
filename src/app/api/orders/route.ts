import { NextResponse } from "next/server";

import { createDbClient } from "@/lib/db-client";

// Orders change constantly (new sales, status flips) — never cache the list.
export const dynamic = "force-dynamic";

type OrderRow = {
  id: string;
  order_ref: string;
  created_at: string;
  cashier_name: string | null;
  customer_name: string | null;
  order_type: "DINE_IN" | "TAKEAWAY";
  table_number: number | null;
  note: string | null;
  subtotal: number | null;
  discount: number | null;
  total_amount: number | null;
  payment_method: "TUNAI" | "QRIS" | "TRANSFER" | null;
  payment_status: "PENDING" | "SUCCESS" | "DEPOSIT" | "REFUNDED";
  order_status: "ANTRIAN" | "SELESAI" | "DIBATALKAN";
  is_open_bill: boolean;
  reservation_id: string | null;
  order_items: {
    id: string;
    product_name: string | null;
    quantity: number;
    unit_price: number | null;
    subtotal_price: number;
    modifier: string | null;
  }[];
  cancellation_requests?: { id: string; status: string }[];
};

// GET /api/orders — full order list (newest first) with line items, mapped to
// the frontend Order shape consumed by the Pesanan page.
export async function GET() {
  const db = createDbClient();
  
  // 1. Fetch orders with their line items
  const { data, error } = await db
    .from("orders")
    .select(
      "id, order_ref, created_at, cashier_name, customer_name, order_type, table_number, note, subtotal, discount, total_amount, payment_method, payment_status, order_status, is_open_bill, reservation_id, order_items(id, product_name, quantity, unit_price, subtotal_price, modifier)",
    )
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 2. Fetch pending cancellation requests separately (workaround for PostgREST schema cache relationship issue)
  const { data: cancellations } = await db
    .from("cancellation_requests")
    .select("order_id, status")
    .eq("status", "PENDING");

  const pendingCancelMap = new Set(
    (cancellations || []).map((c) => c.order_id),
  );

  // 3. Fetch reservations for orders that have them
  const resIds = Array.from(new Set((data as OrderRow[]).map(o => o.reservation_id).filter(Boolean))) as string[];
  let reservationsMap: Record<string, any> = {};
  if (resIds.length > 0) {
    const { data: resData } = await db
      .from("reservations")
      .select("id, status, reservation_date, start_time, end_time, deposit_amount, notes")
      .in("id", resIds);
    if (resData) {
      reservationsMap = resData.reduce((acc, r) => {
        acc[r.id] = r;
        return acc;
      }, {} as Record<string, any>);
    }
  }

  const orders = (data as OrderRow[]).map((o) => {
    const pendingCancellation = pendingCancelMap.has(o.id);
    const res = o.reservation_id ? reservationsMap[o.reservation_id] : null;
    
    return {
      id: o.order_ref,
      dbId: o.id,
      createdAt: o.created_at,
      cashier: o.cashier_name ?? "Karyawan",
      customerName: o.customer_name ?? "Umum",
      orderType: o.order_type,
      tableNumber: o.table_number ?? undefined,
      note: o.note ?? undefined,
      items: Object.values((o.order_items ?? []).reduce((acc, i) => {
        const key = `${i.product_name}-${i.modifier ?? ""}`;
        if (acc[key]) {
          acc[key].qty += Number(i.quantity);
          acc[key].subtotal += Number(i.subtotal_price);
        } else {
          acc[key] = {
            id: i.id,
            name: i.product_name ?? "Item",
            qty: Number(i.quantity),
            price: Number(i.unit_price ?? 0),
            subtotal: Number(i.subtotal_price),
            modifier: i.modifier ?? undefined,
          };
        }
        return acc;
      }, {} as Record<string, any>)) as any[],
      subtotal: Number(o.subtotal ?? 0),
      discount: Number(o.discount ?? 0),
      total: Number(o.total_amount ?? 0),
      paymentMethod: o.payment_method ?? "TUNAI",
      paymentStatus: o.payment_status,
      orderStatus: o.order_status,
      isOpenBill: o.is_open_bill,
      reservationId: o.reservation_id ?? undefined,
      cancellationPending: pendingCancellation || undefined,
      reservation: res ? {
        status: res.status,
        date: res.reservation_date,
        startTime: String(res.start_time).slice(0, 5),
        endTime: String(res.end_time).slice(0, 5),
        downPayment: Number(res.deposit_amount ?? 0),
        note: res.notes ?? undefined,
      } : undefined,
    };
  });

  return NextResponse.json({ data: orders });
}

type OrderItemInput = {
  productId: string;
  qty: number;
  modifier?: string;
};

type CreateOrderBody = {
  orderRef: string;
  cashierName: string;
  customerName?: string;
  orderType: "DINE_IN" | "TAKEAWAY";
  tableNumber?: number;
  note?: string;
  paymentMethod: "TUNAI" | "QRIS" | "TRANSFER";
  amountPaid: number;
  changeAmount?: number;
  discount?: number;
  items: OrderItemInput[];
  isOpenBill?: boolean;
  reservationId?: string;
};

// Exported for unit testing.
export function validate(body: unknown): { error: string } | { body: CreateOrderBody } {
  if (typeof body !== "object" || body === null) {
    return { error: "Request body must be a JSON object" };
  }
  const b = body as Record<string, unknown>;

  if (typeof b.orderRef !== "string" || b.orderRef.trim() === "") {
    return { error: "orderRef is required" };
  }
  if (typeof b.cashierName !== "string" || b.cashierName.trim() === "") {
    return { error: "cashierName is required" };
  }
  if (b.orderType !== "DINE_IN" && b.orderType !== "TAKEAWAY") {
    return { error: "orderType must be DINE_IN or TAKEAWAY" };
  }
  const isOpenBill = b.isOpenBill === true;
  if (
    !isOpenBill &&
    b.paymentMethod !== "TUNAI" &&
    b.paymentMethod !== "QRIS" &&
    b.paymentMethod !== "TRANSFER"
  ) {
    return { error: "paymentMethod must be TUNAI, QRIS, or TRANSFER" };
  }
  if (typeof b.amountPaid !== "number" || b.amountPaid < 0) {
    return { error: "amountPaid must be a non-negative number" };
  }
  if (
    b.discount !== undefined &&
    (typeof b.discount !== "number" || b.discount < 0)
  ) {
    return { error: "discount must be a non-negative number" };
  }
  if (
    b.tableNumber !== undefined &&
    (typeof b.tableNumber !== "number" || b.tableNumber <= 0)
  ) {
    return { error: "tableNumber must be a positive number" };
  }
  if (!Array.isArray(b.items) || b.items.length === 0) {
    return { error: "items must be a non-empty array" };
  }
  for (const item of b.items) {
    if (
      typeof item !== "object" ||
      item === null ||
      typeof (item as Record<string, unknown>).productId !== "string" ||
      typeof (item as Record<string, unknown>).qty !== "number" ||
      (item as Record<string, unknown>).qty as number <= 0
    ) {
      return { error: "Each item needs a productId and a positive qty" };
    }
  }

  return {
    body: {
      orderRef: b.orderRef,
      cashierName: b.cashierName,
      customerName: typeof b.customerName === "string" ? b.customerName : undefined,
      orderType: b.orderType,
      tableNumber: typeof b.tableNumber === "number" ? b.tableNumber : undefined,
      note: typeof b.note === "string" ? b.note : undefined,
      paymentMethod: isOpenBill ? "TUNAI" : (b.paymentMethod as "TUNAI" | "QRIS" | "TRANSFER"),
      amountPaid: isOpenBill ? 0 : (b.amountPaid as number),
      changeAmount: typeof b.changeAmount === "number" ? b.changeAmount : 0,
      discount: typeof b.discount === "number" ? b.discount : 0,
      items: b.items as OrderItemInput[],
      isOpenBill,
      reservationId: typeof b.reservationId === "string" ? b.reservationId : undefined,
    },
  };
}

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validated = validate(json);
  if ("error" in validated) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }
  const body = validated.body;

  const db = createDbClient();
  const { data, error } = await db.rpc("create_order_transaction", {
    p_order_ref: body.orderRef,
    p_cashier_name: body.cashierName,
    p_customer_name: body.customerName ?? null,
    p_order_type: body.orderType,
    p_table_number: body.tableNumber ?? null,
    p_note: body.note ?? null,
    p_payment_method: body.paymentMethod,
    p_amount_paid: body.amountPaid,
    p_change_amount: body.changeAmount ?? 0,
    p_items: body.items,
    p_discount: body.discount ?? 0,
    p_is_open_bill: body.isOpenBill ?? false,
    p_reservation_id: body.reservationId ?? null,
  });

  if (error) {
    // 23505 = unique_violation (duplicate order_ref) -> 409 Conflict.
    // Everything else raised by the function (bad product id/qty/enum) is a
    // malformed request from the caller -> 400 Bad Request.
    const status = error.code === "23505" ? 409 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }

  const result = data?.[0];
  return NextResponse.json({ data: result }, { status: 201 });
}
