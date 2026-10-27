import { NextResponse } from "next/server";

import { createDbClient } from "@/lib/db-client";

export const dynamic = "force-dynamic";

// GET /api/cancellations?status=PENDING
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const db = createDbClient();
  let query = db
    .from("cancellation_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data: rawRequests, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const orderIds = Array.from(new Set((rawRequests ?? []).map((r: any) => r.order_id).filter(Boolean)));
  let orderMap = new Map<string, any>();
  if (orderIds.length > 0) {
    const { data: ordersData } = await db.from("orders").select("id, order_ref, customer_name, total_amount").in("id", orderIds);
    if (ordersData) {
      orderMap = new Map(ordersData.map((o: any) => [o.id, o]));
    }
  }

  const mapped = (rawRequests ?? []).map((r: Record<string, unknown>) => {
    const order = orderMap.get(r.order_id as string) as Record<string, unknown> | undefined;
    return {
      id: r.id,
      orderId: r.order_id,
      orderRef: order?.order_ref ?? "",
      customerName: order?.customer_name ?? "Pelanggan",
      orderTotal: Number(order?.total_amount ?? 0),
      itemIds: r.item_ids ?? undefined,
      requestedBy: r.requested_by,
      reason: r.reason ?? undefined,
      status: r.status,
      reviewedAt: r.reviewed_at ?? undefined,
      createdAt: r.created_at,
    };
  });

  return NextResponse.json({ data: mapped });
}

// POST /api/cancellations — create cancellation request
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const b = (body ?? {}) as Record<string, unknown>;

  if (typeof b.orderId !== "string" || !b.orderId) {
    return NextResponse.json(
      { error: "orderId is required" },
      { status: 400 },
    );
  }
  if (typeof b.requestedBy !== "string" || !b.requestedBy) {
    return NextResponse.json(
      { error: "requestedBy is required" },
      { status: 400 },
    );
  }

  const db = createDbClient();

  // Check for existing PENDING request on this order
  const { data: existing } = await db
    .from("cancellation_requests")
    .select("id")
    .eq("order_id", b.orderId)
    .eq("status", "PENDING")
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "Sudah ada permintaan pembatalan yang menunggu persetujuan" },
      { status: 409 },
    );
  }

  const { data, error } = await db
    .from("cancellation_requests")
    .insert({
      order_id: b.orderId,
      item_ids: Array.isArray(b.itemIds) ? b.itemIds : null,
      requested_by: b.requestedBy,
      reason: typeof b.reason === "string" ? b.reason : null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
