"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  Inbox,
  Loader2,
  Printer,
  ReceiptText,
  RefreshCw,
  Search,
  X,
  Plus,
  LogIn,
  Ban,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import useSWR from "swr";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sidebar } from "@/components/layout/sidebar";
import { HeaderBar } from "@/components/layout/header-bar";
import {
  OrderCard,
  STATUS_BADGE_CLASS,
  STATUS_LABEL,
} from "@/components/pesanan/order-card";
import { AddItemDialog } from "@/components/kasir/add-item-dialog";
import { PaymentDialog } from "@/components/kasir/payment-dialog";
import { CancelOrderDialog } from "@/components/kasir/cancel-order-dialog";
import { cn } from "@/lib/utils";

import { formatRupiah, formatTime } from "@/lib/format";
import { saveReceipt, type Receipt } from "@/lib/receipt";
import { fetchRoster } from "@/lib/cashiers";
import { updateReservation } from "@/lib/reservations";
import {
  fetchOrders,
  updateOrderStatus,
  closeOpenBill,
  type Order,
  type OrderStatus,
  type OrderType,
} from "@/lib/orders";

const ALL_TYPES = "Semua";
type TypeFilter = typeof ALL_TYPES | OrderType;

const TYPE_FILTER_LABEL: Record<TypeFilter, string> = {
  Semua: "Semua",
  DINE_IN: "Makan di Tempat",
  TAKEAWAY: "Bawa Pulang",
};

// Active queue first, ordered by time: ANTRIAN oldest-first (FIFO — the order
// waiting longest is served next), then SELESAI most-recently-completed first.
function sortOrders(orders: Order[]): Order[] {
  const rank: Record<OrderStatus, number> = { ANTRIAN: 0, SELESAI: 1, DIBATALKAN: 2 };
  return [...orders].sort((a, b) => {
    if (rank[a.orderStatus] !== rank[b.orderStatus]) {
      return rank[a.orderStatus] - rank[b.orderStatus];
    }
    return a.orderStatus === "ANTRIAN"
      ? a.createdAt.localeCompare(b.createdAt)
      : b.createdAt.localeCompare(a.createdAt);
  });
}

// Rebuilds a printable receipt from a saved order. Payment details (exact cash
// tendered / change) aren't stored on the order, so a reprint shows the order
// total as amount paid with no change — accurate for QRIS/TRANSFER and a fair
// approximation for a cash reprint.
function buildReceiptFromOrder(order: Order): Receipt {
  const subtotal = order.items.reduce((sum, item) => sum + item.subtotal, 0);
  const discount = Math.max(0, subtotal - order.total);
  return {
    orderRef: order.id,
    createdAt: order.createdAt,
    cashier: order.cashier,
    customerName: order.customerName,
    items: order.items.map((item) => ({
      name: item.name,
      qty: item.qty,
      price: item.price,
      subtotal: item.subtotal,
    })),
    subtotal,
    discount,
    total: order.total,
    orderType: order.orderType,
    tableNumber: order.tableNumber,
    note: order.note,
    paymentMethod: order.paymentMethod,
    amountPaid: order.total,
    change: 0,
  };
}

export default function PesananPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(ALL_TYPES);
  const [selectedId, setSelectedId] = useState<string>("");
  const [recentId, setRecentId] = useState<string | null>(null);
  const [limit, setLimit] = useState(18);

  const [addItemOpen, setAddItemOpen] = useState(false);
  const [closeBillOpen, setCloseBillOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [closeBillKey, setCloseBillKey] = useState(0);

  const { data: cashiersData = { entries: [] } } = useSWR("/api/cashiers", fetchRoster);
  const cashiers = cashiersData.entries.map((entry) => entry.name);

  const { data: orders = [], error: swrError, isLoading, mutate } = useSWR("/api/orders", fetchOrders, {
    onSuccess: (data) => {
      setSelectedId((cur) => cur || sortOrders(data)[0]?.id || "");
    }
  });

  const loading = isLoading;
  const error = swrError instanceof Error ? swrError.message : swrError ? "Gagal memuat pesanan" : null;

  const refresh = useCallback(() => {
    mutate();
    toast.success("Daftar pesanan diperbarui");
  }, [mutate]);

  const sortedOrders = useMemo(() => sortOrders(orders), [orders]);

  // Queue position (#1 = next to serve) is computed from the full active
  // queue, independent of the current filter/search — a card's position
  // shouldn't shift just because you typed in the search box.
  const queuePosition = useMemo(() => {
    const map = new Map<string, number>();
    sortedOrders
      .filter((o) => o.orderStatus === "ANTRIAN")
      .forEach((order, index) => map.set(order.id, index + 1));
    return map;
  }, [sortedOrders]);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    return sortedOrders.filter((order) => {
      const matchesType =
        typeFilter === ALL_TYPES || order.orderType === typeFilter;
      const matchesQuery =
        !query ||
        order.customerName.toLowerCase().includes(query) ||
        order.id.toLowerCase().includes(query) ||
        order.orderType.toLowerCase().includes(query) ||
        order.paymentMethod.toLowerCase().includes(query) ||
        (order.note || "").toLowerCase().includes(query) ||
        order.orderStatus.toLowerCase().includes(query) ||
        (order.reservationId ? "reservasi" : "").includes(query) ||
        (order.isOpenBill ? "open bill" : "").includes(query);
      return matchesType && matchesQuery;
    });
  }, [sortedOrders, typeFilter, search]);

  const antrianOrders = filteredOrders.filter((o) => o.orderStatus === "ANTRIAN");
  const selesaiOrders = filteredOrders.filter((o) => o.orderStatus === "SELESAI");
  const selected = orders.find((order) => order.id === selectedId);

  // Briefly highlight the order whose status just changed, so the live update
  // is visible even as the card moves between sections.
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    },
    [],
  );

  async function toggleStatus(order: Order) {
    const previousStatus = order.orderStatus;
    const nextStatus: OrderStatus =
      previousStatus === "ANTRIAN" ? "SELESAI" : "ANTRIAN";
    // Optimistic: flip in place so the UI re-renders instantly, no reload.
    mutate(
      (prev) => prev?.map((o) => (o.id === order.id ? { ...o, orderStatus: nextStatus } : o)),
      false
    );
    setRecentId(order.id);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setRecentId(null), 1600);

    try {
      await updateOrderStatus(order.id, nextStatus);
      toast.success(
        nextStatus === "SELESAI"
          ? `Pesanan ${order.id} selesai`
          : `Pesanan ${order.id} dikembalikan ke antrian`,
      );
    } catch (e) {
      // Revert the optimistic change if the server rejected it.
      mutate(
        (prev) => prev?.map((o) => (o.id === order.id ? { ...o, orderStatus: previousStatus } : o)),
        false
      );
      toast.error(
        e instanceof Error ? e.message : "Gagal memperbarui status pesanan",
      );
    }
  }

  async function handleCheckIn(order: Order) {
    if (!order.reservationId) return;
    try {
      await updateReservation(order.reservationId, { status: "CHECKED_IN" });
      toast.success("Check-In reservasi berhasil");
      mutate(
        (prev) =>
          prev?.map((o) =>
            o.id === order.id && o.reservation
              ? { ...o, reservation: { ...o.reservation, status: "CHECKED_IN" } }
              : o
          ),
        { revalidate: false }
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal check-in reservasi");
    }
  }

  async function handleCloseBillCash(
    amountPaid: number,
    change: number,
    customerName: string,
    cashierName: string,
    discount: number
  ) {
    if (!selected) return;
    try {
      await closeOpenBill(selected.id, {
        paymentMethod: "TUNAI",
        amountPaid,
        changeAmount: change,
        discount,
      });
      toast.success("Tagihan berhasil dilunasi");
      setCloseBillOpen(false);
      mutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal melunasi tagihan");
    }
  }

  async function handleCloseBillManual(
    method: "QRIS" | "TRANSFER" | "OPEN_BILL",
    customerName: string,
    cashierName: string,
    discount: number
  ) {
    if (!selected || method === "OPEN_BILL") return; // Should not happen in CLOSE_BILL mode
    try {
      await closeOpenBill(selected.id, {
        paymentMethod: method,
        amountPaid: selected.total - discount,
        changeAmount: 0,
        discount,
      });
      toast.success(`Pembayaran ${method} berhasil dicatat`);
      setCloseBillOpen(false);
      mutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mencatat pembayaran");
    }
  }

  return (
    <div className="flex h-dvh bg-background">
      <Sidebar active="pesanan" />

      <div className="flex flex-1 flex-col overflow-hidden">
        <HeaderBar
          title="Antrian Pesanan"
          subtitle="Daftar Antrian & Riwayat Pesanan Hari Ini"
          onRefresh={refresh}
        />

        <div className="flex flex-1 gap-4 overflow-hidden p-4">
          {/* Main: active queue + completed grid */}
          <div className="@container flex flex-1 flex-col gap-3 overflow-hidden">
            <div className="flex flex-col gap-3 w-full">
              <Tabs
                value={typeFilter}
                onValueChange={(v) => setTypeFilter(v as TypeFilter)}
                className="w-full"
              >
                <TabsList className="flex h-11 w-full items-center justify-start sm:justify-center p-1">
                  {(Object.keys(TYPE_FILTER_LABEL) as TypeFilter[]).map(
                    (key) => (
                      <TabsTrigger
                        key={key}
                        value={key}
                        className="px-3.5 text-xs sm:text-sm font-medium"
                      >
                        {TYPE_FILTER_LABEL[key]}
                      </TabsTrigger>
                    ),
                  )}
                </TabsList>
              </Tabs>

              <div className="relative w-full">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari pesanan..."
                  className="h-10 w-full pl-9 text-xs"
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center gap-2 px-6 py-24 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Memuat pesanan...
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center gap-3 px-6 py-24 text-center">
                  <p className="text-sm text-destructive">{error}</p>
                  <Button variant="outline" size="sm" onClick={refresh}>
                    Coba lagi
                  </Button>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 px-6 py-24 text-center">
                  <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                    <Inbox className="size-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">Belum ada pesanan</p>
                    <p className="text-sm text-muted-foreground">
                      Pesanan baru dari kasir akan muncul di sini.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-5 p-0.5 pb-4">
                  <section className="flex flex-col gap-2">
                    <SectionLabel
                      label="Sedang Diproses"
                      count={antrianOrders.length}
                    />
                    {antrianOrders.length === 0 ? (
                      <p className="px-1 py-2 text-sm text-muted-foreground">
                        Tidak ada antrian aktif.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 gap-4 @[350px]:grid-cols-2 @[530px]:grid-cols-3 @[720px]:grid-cols-4">
                        {antrianOrders.map((order) => (
                          <OrderCard
                            key={order.id}
                            order={order}
                            position={queuePosition.get(order.id)}
                            isActive={order.id === selected?.id}
                            justUpdated={order.id === recentId}
                            onSelect={() => setSelectedId(order.id)}
                            onToggleStatus={() => toggleStatus(order)}
                          />
                        ))}
                      </div>
                    )}
                  </section>

                  {selesaiOrders.length > 0 && (
                    <section className="flex flex-col gap-2">
                      <SectionLabel
                        label="Selesai Baru Saja"
                        count={selesaiOrders.length}
                      />
                      <div className="grid grid-cols-1 gap-4 @[350px]:grid-cols-2 @[530px]:grid-cols-3 @[720px]:grid-cols-4">
                        {selesaiOrders.slice(0, limit).map((order) => (
                          <OrderCard
                            key={order.id}
                            order={order}
                            isActive={order.id === selected?.id}
                            justUpdated={order.id === recentId}
                            onSelect={() => setSelectedId(order.id)}
                            onToggleStatus={() => toggleStatus(order)}
                          />
                        ))}
                      </div>
                      {selesaiOrders.length > limit && (
                        <div className="flex flex-col items-center gap-2 mt-2">
                          <p className="text-xs text-muted-foreground">
                            Menampilkan {limit} dari {selesaiOrders.length} pesanan selesai
                          </p>
                          <Button variant="outline" size="sm" onClick={() => setLimit(l => l + 18)}>
                            Tampilkan Lebih Banyak
                          </Button>
                        </div>
                      )}
                    </section>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Detail panel */}
          <Card className="flex w-[320px] shrink-0 flex-col gap-0 overflow-hidden p-0">
            {selected ? (
              <>
                <div className="flex items-center justify-between border-b px-3.5 py-2.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <ReceiptText className="size-4 shrink-0" />
                    <h2 className="text-sm font-semibold truncate">Detail Pesanan</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedId("")}
                    className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
                    aria-label="Tutup detail"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto">
                  <div className="flex flex-col gap-3.5 p-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-sm font-semibold">
                          #{selected.id}
                        </span>
                        <Badge
                          className={cn(
                            "border-transparent text-xs",
                            STATUS_BADGE_CLASS[selected.orderStatus],
                          )}
                        >
                          {STATUS_LABEL[selected.orderStatus]}
                        </Badge>
                        {selected.paymentStatus === "SUCCESS" && (
                          <Badge variant="success" className="text-xs">
                            LUNAS &middot; {selected.paymentMethod}
                          </Badge>
                        )}
                        {selected.isOpenBill && (
                          <Badge variant="warning" className="text-xs font-bold">
                            OPEN BILL
                          </Badge>
                        )}
                        {selected.reservationId && (
                          <Badge variant="purple" className="text-xs font-bold">
                            RESERVASI
                          </Badge>
                        )}
                        {selected.cancellationPending && (
                          <Badge variant="destructive" className="text-xs">
                            Pembatalan
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground leading-snug">
                        {selected.customerName} &middot;{" "}
                        {selected.orderType === "DINE_IN"
                          ? `Lantai ${selected.tableNumber ?? 1}`
                          : "Bawa Pulang"}{" "}
                        &middot; {formatTime(selected.createdAt)}
                      </p>
                      {selected.reservationId && selected.reservation && (
                        <p className="mt-1 text-xs text-muted-foreground leading-snug">
                          Jadwal Reservasi: {selected.reservation.date} ({selected.reservation.startTime} - {selected.reservation.endTime})
                        </p>
                      )}
                    </div>

                    <Separator />

                    <div className="relative flex items-center h-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Daftar Menu
                      </p>
                      {(selected.isOpenBill || selected.reservationId) && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="absolute right-0 top-1/2 -translate-y-1/2 h-7 text-xs px-2.5 bg-success-subtle text-success-foreground border-success-border hover:bg-success-border/50"
                          onClick={() => setAddItemOpen(true)}
                        >
                          <Plus className="size-3.5 mr-1" /> Tambah Menu
                        </Button>
                      )}
                    </div>
                    <div className="flex flex-col gap-2.5 mt-2">
                      {selected.items.map((item, index) => (
                        <div
                          key={`${item.name}-${index}`}
                          className="flex items-start justify-between gap-2 text-xs sm:text-sm"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium leading-snug truncate">
                              {item.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.qty}x
                              {item.modifier && <> &middot; {item.modifier}</>}
                            </p>
                          </div>
                          <span className="font-medium shrink-0">
                            {formatRupiah(item.subtotal)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {(selected.note || selected.reservation?.note) && (
                      <div className="rounded-lg bg-card p-3 shadow-sm border border-border">
                        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1.5">
                          Catatan Khusus
                        </p>
                        <p className="text-sm italic text-foreground">
                          &ldquo;{selected.note || selected.reservation?.note}&rdquo;
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2.5 border-t bg-background p-3.5">
                  {selected.reservation ? (
                    <div className="flex flex-col gap-1.5 pb-1">
                      <div className="flex items-center justify-between text-sm font-medium text-muted-foreground">
                        <span>Total Keseluruhan</span>
                        <span>{formatRupiah(selected.total)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm font-medium text-success">
                        <span>Uang Muka (DP)</span>
                        <span>- {formatRupiah(selected.reservation.downPayment)}</span>
                      </div>
                      <div className="flex items-center justify-between text-base font-bold mt-1 pt-2 border-t border-dashed">
                        <span>Sisa Tagihan</span>
                        <span>{formatRupiah(Math.max(0, selected.total - selected.reservation.downPayment))}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-base font-bold pb-1">
                      <span>Total Akhir</span>
                      <span>{formatRupiah(selected.total)}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {(() => {
                      const showCheckIn = selected.reservationId && selected.reservation?.status !== "CHECKED_IN";
                      const showTutupBayar = !showCheckIn && (selected.isOpenBill || selected.reservationId) && selected.orderStatus !== "SELESAI";
                      const showActionBtn = showCheckIn || showTutupBayar;
                      const showBatalkan = !selected.cancellationPending;

                      const numTopButtons = (showActionBtn ? 1 : 0) + (showBatalkan ? 1 : 0);
                      const selesaiFullWidth = numTopButtons === 1;

                      return (
                        <>
                          {showCheckIn ? (
                            <Button
                              type="button"
                              variant="purple"
                              className="h-10 text-sm"
                              onClick={() => handleCheckIn(selected)}
                            >
                              <LogIn className="size-4 shrink-0 mr-1.5" />
                              Check-In
                            </Button>
                          ) : showTutupBayar ? (
                            <Button
                              type="button"
                              variant="warning"
                              className="h-10 text-sm"
                              onClick={() => {
                                setCloseBillKey(k => k + 1);
                                setCloseBillOpen(true);
                              }}
                            >
                              <CreditCard className="size-4 shrink-0 mr-1.5" />
                              Tutup & Bayar
                            </Button>
                          ) : null}

                          {showBatalkan && (
                            <Button
                              type="button"
                              variant="destructive"
                              className="h-10 text-sm"
                              onClick={() => setCancelOpen(true)}
                            >
                              <Ban className="size-4 shrink-0 mr-1.5" />
                              Batalkan
                            </Button>
                          )}

                          <Button
                            type="button"
                            variant="outline"
                            className="h-10 text-sm font-medium"
                            disabled={
                              selected.isOpenBill ||
                              (!!selected.reservationId && selected.paymentStatus !== "SUCCESS" && selected.total > (selected.reservation?.downPayment ?? 0))
                            }
                            onClick={() => {
                              saveReceipt(buildReceiptFromOrder(selected));
                              toast.info("Menyiapkan cetak ulang struk...");
                              router.push("/kasir/struk");
                            }}
                          >
                            <Printer className="size-4 shrink-0 xl:mr-1.5" />
                            <span className="hidden xl:inline">Cetak Struk</span>
                            <span className="xl:hidden">Cetak</span>
                          </Button>

                          <Button
                            type="button"
                            className={cn(
                              "h-10 text-sm font-medium",
                              selesaiFullWidth && "col-span-2"
                            )}
                            disabled={
                              selected.orderStatus === "SELESAI" ||
                              selected.paymentStatus !== "SUCCESS" ||
                              (!!selected.reservationId && selected.reservation?.status !== "CHECKED_IN")
                            }
                            onClick={() => toggleStatus(selected)}
                          >
                            <Check className="size-4 shrink-0 mr-1.5" />
                            Selesaikan
                          </Button>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-accent/60 text-muted-foreground">
                  <ReceiptText className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Belum Ada Pesanan Dipilih</p>
                  <p className="mt-1 text-xs text-muted-foreground max-w-[200px]">
                    Ketuk salah satu kartu pesanan untuk melihat rincian detail menu & opsi cetak.
                  </p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {(selected?.isOpenBill || !!selected?.reservationId) && (
        <AddItemDialog
          open={addItemOpen}
          onOpenChange={setAddItemOpen}
          orderRef={selected.id}
          onSuccess={() => mutate()}
        />
      )}

      {(selected?.isOpenBill || !!selected?.reservationId) && (
        <PaymentDialog
          key={`close-${closeBillKey}`}
          open={closeBillOpen}
          onOpenChange={setCloseBillOpen}
          total={selected.reservationId ? Math.max(0, selected.total - (selected.reservation?.downPayment || 0)) : selected.total}
          cashiers={cashiers}
          onCashConfirmed={handleCloseBillCash}
          onManualPaid={handleCloseBillManual}
          mode="CLOSE_BILL"
          defaultCustomerName={selected.customerName}
          defaultCashierName={selected.cashier}
          defaultDiscount={selected.discount}
        />
      )}
      {selected && (
        <CancelOrderDialog
          open={cancelOpen}
          onOpenChange={setCancelOpen}
          order={selected}
          onSuccess={() => mutate()}
        />
      )}
    </div>
  );
}

function SectionLabel({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-2 px-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-xs text-muted-foreground">({count})</span>
    </div>
  );
}
