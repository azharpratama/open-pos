"use client";

import { Check, Clock, RotateCcw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatRupiah, formatTime } from "@/lib/format";
import type { Order, OrderStatus } from "@/lib/orders";

export const STATUS_LABEL: Record<OrderStatus, string> = {
  ANTRIAN: "Antrian",
  SELESAI: "Selesai",
  DIBATALKAN: "Dibatalkan",
};

export const STATUS_BADGE_CLASS: Record<OrderStatus, string> = {
  ANTRIAN: "bg-warning-subtle text-warning-foreground border-warning-border",
  SELESAI: "bg-success-subtle text-success-foreground border-success-border",
  DIBATALKAN: "bg-danger-subtle text-destructive border-danger-border",
};

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

type OrderCardProps = {
  order: Order;
  position?: number;
  isActive: boolean;
  justUpdated?: boolean;
  onSelect: () => void;
  onToggleStatus: () => void;
};

export function OrderCard({
  order,
  position,
  isActive,
  justUpdated = false,
  onSelect,
  onToggleStatus,
}: OrderCardProps) {
  const isAntrian = order.orderStatus === "ANTRIAN";
  const locationLabel =
    order.orderType === "DINE_IN"
      ? `Lantai ${order.tableNumber ?? 1}`
      : "Bawa Pulang";
  const visibleItems = order.items.slice(0, 2);
  const extraCount = order.items.length - visibleItems.length;

  const shortId = order.id
    .replace(/^SEED-\d{4}-\d{2}-\d{2}-/, "")
    .replace(/^SEED-/, "")
    .replace(/^[#\-_\s]+/, "");
  const displayId = `#${shortId}`;

  return (
    <Card
      className={cn(
        "flex flex-col justify-between h-full gap-0 overflow-hidden p-0 transition-all",
        isActive
          ? "border-primary ring-2 ring-primary/40 bg-accent/40 shadow-sm"
          : "hover:border-primary/60",
        justUpdated && "ring-2 ring-primary/60",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "flex flex-1 w-full flex-col justify-between gap-2.5 p-3 text-left transition-colors",
          isActive && "bg-accent/40",
        )}
      >
        <div className="flex flex-col gap-2.5 w-full">
          <div className="flex items-center gap-2">
            <div className="relative flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
              {initials(order.customerName)}
              {position && (
                <span className="absolute -top-1.5 -left-1.5 flex size-4.5 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">
                  {position}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold leading-snug text-sm text-foreground truncate">
                {order.customerName}
              </p>
              <p className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5 truncate">
                <Clock className="size-3 shrink-0" />
                {formatTime(order.createdAt)} &middot; {locationLabel}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-0.5 text-sm text-muted-foreground">
            {visibleItems.map((item, index) => (
              <p key={index} className="truncate">
                {item.qty}x {item.name}
                {item.modifier && (
                  <span className="text-xs"> &middot; {item.modifier}</span>
                )}
              </p>
            ))}
            {extraCount > 0 && <p>+{extraCount} menu lainnya</p>}
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-2 border-t border-border/40 mt-1 w-full">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none flex-wrap">
            <Badge
              className={cn(
                "border-transparent text-[10px] px-1.5 py-0 shrink-0",
                STATUS_BADGE_CLASS[order.orderStatus],
              )}
            >
              {STATUS_LABEL[order.orderStatus]}
            </Badge>
            {order.isOpenBill && (
              <Badge variant="warning" className="text-[10px] px-1.5 py-0 shrink-0 font-bold">
                OPEN BILL
              </Badge>
            )}
            {order.reservationId && (
              <Badge variant="purple" className="text-[10px] px-1.5 py-0 shrink-0 font-bold">
                RESERVASI
              </Badge>
            )}
            {order.cancellationPending && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0 shrink-0">
                Pembatalan
              </Badge>
            )}
            <span className="font-mono text-[10px] font-semibold text-muted-foreground bg-muted/80 px-1.5 py-0.5 rounded shrink-0">
              {displayId}
            </span>
            {order.discount > 0 && (
              <Badge variant="warning" className="text-[10px] px-1.5 py-0 shrink-0">
                Diskon -{formatRupiah(order.discount)}
              </Badge>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Total</span>
            <span className="text-base font-bold text-foreground">
              {formatRupiah(order.total)}
            </span>
          </div>
        </div>
      </button>

      <div className="border-t p-2.5">
        <Button
          type="button"
          variant={isAntrian ? "default" : "outline"}
          className="h-11 w-full text-sm [&_svg:not([class*='size-'])]:size-4.5"
          disabled={
            order.isOpenBill || 
            order.paymentStatus !== "SUCCESS" || 
            (!!order.reservationId && order.reservation?.status !== "CHECKED_IN")
          }
          onClick={onToggleStatus}
        >
          {isAntrian ? (
            <>
              <Check />
              Tandai Selesai
            </>
          ) : (
            <>
              <RotateCcw />
              Ke Antrian
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}
