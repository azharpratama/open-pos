"use client";

import { Loader2, ReceiptText } from "lucide-react";
import useSWR from "swr";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatRupiah } from "@/lib/format";
import { fetchOrders, type Order } from "@/lib/orders";

const MAX_ROWS = 50;

// created_at from the orders API is a UTC timestamp without an explicit zone.
// Make the zone explicit so it renders in real WIB time, not the browser's.
function orderStamp(ts: string): string {
  if (!ts) return "-";
  const base = ts.replace(" ", "T");
  const normalized = /[+-]\d{2}$/.test(base) ? `${base}:00` : base;
  const hasZone = /[zZ]|[+-]\d{2}(?::?\d{2})?$/.test(normalized);
  const d = new Date(hasZone ? normalized : `${normalized}Z`);
  if (isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(d);
}

function itemsSummary(order: Order): string {
  return order.items.map((i) => `${i.qty}x ${i.name}`).join(", ");
}

// Compact read-only row for one order.
function OrderRow({ order }: { order: Order }) {
  const paid = order.paymentStatus === "SUCCESS";
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium">
            {order.customerName}
          </span>
          <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
            #{order.id.slice(-4)}
          </span>
        </div>
        <div className="truncate text-xs text-muted-foreground">
          {orderStamp(order.createdAt)} · {itemsSummary(order)}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <span className="text-sm font-semibold tabular-nums">
          {formatRupiah(order.total)}
        </span>
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          {order.paymentMethod}
          <span
            className={cn(
              "size-1.5 rounded-full",
              paid ? "bg-success" : "bg-warning",
            )}
            title={paid ? "Lunas" : "Pending"}
          />
        </span>
      </div>
    </div>
  );
}

// Read-only history of recent orders (newest first), shown beside the shift
// recap on the owner dashboard.
export function OrderHistoryCard() {
  const { data = [], error: swrError, isLoading } = useSWR("/api/orders", fetchOrders);

  const orders = data.slice(0, MAX_ROWS);
  const loading = isLoading;
  const error = swrError instanceof Error ? swrError.message : swrError ? "Gagal memuat pesanan" : null;

  return (
    <Card className="gap-4 p-5">
      <div className="flex items-center gap-2">
        <div className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <ReceiptText className="size-4.5" />
        </div>
        <div>
          <p className="font-semibold leading-tight">Riwayat Pemesanan</p>
          <p className="text-xs text-muted-foreground">
            Pesanan terbaru (WIB)
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Memuat...
        </div>
      ) : error ? (
        <p className="py-6 text-center text-sm text-destructive">{error}</p>
      ) : orders.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Belum ada pesanan.
        </p>
      ) : (
        <div className="flex max-h-96 flex-col divide-y overflow-y-auto">
          {orders.map((order) => (
            <OrderRow key={order.id} order={order} />
          ))}
        </div>
      )}
    </Card>
  );
}
