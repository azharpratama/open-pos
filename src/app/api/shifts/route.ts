import { NextResponse } from "next/server";

import { createDbClient } from "@/lib/db-client";

export const dynamic = "force-dynamic";

// GET /api/shifts — recent shifts (last 14 days), newest first. This is the
// owner dashboard's open/close log.
export async function GET() {
  const db = createDbClient();
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await db
    .from("shifts")
    .select("id, opened_at, closed_at, revenue")
    .gte("opened_at", since)
    .order("opened_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data: data.map((s) => ({
      id: s.id,
      openedAt: s.opened_at,
      closedAt: s.closed_at,
      revenue: Number(s.revenue ?? 0),
    })),
  });
}

// POST /api/shifts — opens a shift, recording opened_at = now(). If a shift is
// already open it is reused instead of inserting a second open row — stacking
// open rows would strand the earlier one as an un-closable "Berjalan" orphan.
export async function POST() {
  const db = createDbClient();

  const { data: existing, error: findErr } = await db
    .from("shifts")
    .select("id, opened_at")
    .is("closed_at", null)
    .order("opened_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (findErr) {
    return NextResponse.json({ error: findErr.message }, { status: 500 });
  }
  if (existing) {
    return NextResponse.json(
      { data: { id: existing.id, openedAt: existing.opened_at } },
      { status: 200 },
    );
  }

  const { data, error } = await db
    .from("shifts")
    .insert({})
    .select("id, opened_at")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Gagal membuka shift" },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { data: { id: data.id, openedAt: data.opened_at } },
    { status: 201 },
  );
}

// PATCH /api/shifts — closes the shift that is currently open, stamping
// closed_at = now() and storing its revenue. The server finds the open shift
// itself rather than trusting a client-supplied id: that id lived in per-tab
// sessionStorage and was lost across tabs/logout/devices, which left shifts
// stuck "Berjalan" because the close never reached the DB.
//
// The revenue is likewise summed from the paid orders booked between opened_at
// and the close, not taken from the client. A client-side counter only ever saw
// what that one browser tab rang up, so a shift closed from another device (or
// after a re-login) was recorded as Rp 0.
export async function PATCH() {
  const db = createDbClient();

  const { data: open, error: findErr } = await db
    .from("shifts")
    .select("id, opened_at")
    .is("closed_at", null)
    .order("opened_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (findErr) {
    return NextResponse.json({ error: findErr.message }, { status: 500 });
  }
  if (!open) {
    return NextResponse.json(
      { error: "Tidak ada shift yang sedang berjalan" },
      { status: 404 },
    );
  }

  const closedAt = new Date().toISOString();

  const { data: paid, error: revErr } = await db
    .from("orders")
    .select("total_amount")
    .eq("payment_status", "SUCCESS")
    .gte("created_at", open.opened_at)
    .lte("created_at", closedAt);

  if (revErr) {
    return NextResponse.json({ error: revErr.message }, { status: 500 });
  }

  const revenue = (paid ?? []).reduce(
    (sum, o) => sum + Number(o.total_amount ?? 0),
    0,
  );

  const { data, error } = await db
    .from("shifts")
    .update({ closed_at: closedAt, revenue })
    .eq("id", open.id)
    .is("closed_at", null)
    .select("id, opened_at, closed_at, revenue")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json(
      { error: "Shift tidak ditemukan atau sudah ditutup" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    data: {
      id: data.id,
      openedAt: data.opened_at,
      closedAt: data.closed_at,
      revenue: Number(data.revenue ?? 0),
    },
  });
}
