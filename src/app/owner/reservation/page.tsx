"use client";

import { useMemo, useState } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Plus,
  Settings,
  User,
  UtensilsCrossed,
  Landmark,
  QrCode,
} from "lucide-react";
import { toast } from "sonner";
import useSWR from "swr";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sidebar } from "@/components/layout/sidebar";
import { HeaderBar } from "@/components/layout/header-bar";
import { cn } from "@/lib/utils";
import { formatDateLong, formatRupiah, todayWIB } from "@/lib/format";
import { fetchAppSetting, updateAppSetting } from "@/lib/app-settings";
import {
  createReservation,
  fetchReservations,
  updateReservation,
  type Reservation,
  type ReservationStatus,
} from "@/lib/reservations";
import { fetchMenu, type MenuProduct } from "@/lib/menu";
import { generateOrderRef } from "@/lib/receipt";
import { ManualPaymentPanel } from "@/components/kasir/manual-payment-panel";

const CASH_DENOMINATIONS = [5000, 10000, 20000, 50000, 100000];

function suggestCashAmounts(total: number): number[] {
  if (total <= 0) return [];
  const suggestions = new Set<number>([total]);
  for (const denom of CASH_DENOMINATIONS) {
    suggestions.add(Math.ceil(total / denom) * denom);
  }
  return Array.from(suggestions)
    .filter((amount) => amount >= total)
    .sort((a, b) => a - b)
    .slice(0, 4);
}

const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const FLOORS = [1, 2, 3] as const;

function getWeekDays(startDateStr: string): { date: string; dayName: string; dayNum: number; isToday: boolean }[] {
  const today = todayWIB();
  const d = new Date(startDateStr);
  const dayOfWeek = (d.getDay() + 6) % 7; // Monday = 0
  const monday = new Date(d);
  monday.setDate(d.getDate() - dayOfWeek);

  const result = [];
  for (let i = 0; i < 7; i++) {
    const cur = new Date(monday);
    cur.setDate(monday.getDate() + i);
    const dateStr = cur.toISOString().slice(0, 10);
    result.push({
      date: dateStr,
      dayName: WEEKDAYS[i],
      dayNum: cur.getDate(),
      isToday: dateStr === today,
    });
  }
  return result;
}

const STATUS_COLOR: Record<ReservationStatus, string> = {
  CONFIRMED: "bg-warning-subtle border-warning-border text-warning-foreground",
  CHECKED_IN: "bg-success-subtle border-success-border text-success-foreground",
  COMPLETED: "bg-info-subtle border-info-border text-info-foreground",
  CANCELLED: "bg-danger-subtle border-danger-border text-destructive",
  NO_SHOW: "bg-muted border-muted-foreground/30 text-muted-foreground",
};

export default function OwnerReservationPage() {
  const [selectedDate, setSelectedDate] = useState(() => todayWIB());
  const [activeFloor, setActiveFloor] = useState<number>(3);
  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);

  // SWR Hooks
  const { data: reservations = [], mutate, isLoading } = useSWR(
    ["/api/reservations", selectedDate],
    () => fetchReservations({ startDate: weekDays[0].date, endDate: weekDays[6].date }),
  );

  const { data: minSpendSetting, mutate: mutateMinSpend } = useSWR(
    "reservation_minimum_spend",
    () => fetchAppSetting<{ amount: number }>("reservation_minimum_spend"),
  );

  const minSpendAmount = minSpendSetting?.amount ?? 0;

  // Dialog States
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [minSpendInput, setMinSpendInput] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [createStep, setCreateStep] = useState<1 | 2 | 3 | 4>(1);

  // Form state
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [notes, setNotes] = useState("");

  const [resDate, setResDate] = useState(selectedDate);
  const [startTime, setStartTime] = useState("19:00");
  const [endTime, setEndTime] = useState("21:00");
  const [resFloor, setResFloor] = useState<number>(3);

  const [preOrderItems, setPreOrderItems] = useState<{ product: MenuProduct; qty: number }[]>([]);
  const [depositMethod, setDepositMethod] = useState<"TUNAI" | "QRIS" | "TRANSFER">("TUNAI");
  const [amountInput, setAmountInput] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [detailRes, setDetailRes] = useState<Reservation | null>(null);

  const { data: menuProducts = [] } = useSWR(createOpen ? "menu-products" : null, fetchMenu);

  function shiftWeek(days: number) {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().slice(0, 10));
  }

  async function handleSaveSettings() {
    setSavingSettings(true);
    try {
      await updateAppSetting("reservation_minimum_spend", {
        amount: Number(minSpendInput) || 0,
      });
      toast.success("Pengaturan minimum spend berhasil disimpan");
      mutateMinSpend();
      setSettingsOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSavingSettings(false);
    }
  }

  const preOrderTotal = preOrderItems.reduce(
    (sum, item) => sum + item.product.price * item.qty,
    0,
  );

  const amountPaidNum = Number(amountInput) || 0;
  const change = amountPaidNum - preOrderTotal;
  const isSufficient = depositMethod !== "TUNAI" || (amountPaidNum >= preOrderTotal && preOrderTotal > 0);
  const cashSuggestions = useMemo(() => suggestCashAmounts(preOrderTotal), [preOrderTotal]);

  async function handleCreateReservation() {
    setSubmitting(true);
    try {
      // 1. Create reservation row
      const res = await createReservation({
        customerName: custName.trim(),
        customerPhone: custPhone.trim() || undefined,
        floorNumber: resFloor,
        reservationDate: resDate,
        startTime,
        endTime,
        notes: notes.trim() || undefined,
      });

      // 2. Create linked order & pre-order items (deducts stock immediately)
      const orderRef = generateOrderRef();
      const orderPayload = {
        orderRef,
        cashierName: "Owner",
        customerName: custName.trim(),
        orderType: "DINE_IN",
        tableNumber: resFloor,
        note: notes.trim() || undefined,
        paymentMethod: depositMethod,
        amountPaid: depositMethod === "TUNAI" ? amountPaidNum : preOrderTotal,
        changeAmount: depositMethod === "TUNAI" ? Math.max(0, change) : 0,
        discount: 0,
        reservationId: res.id,
        items: preOrderItems.map((item) => ({
          productId: item.product.id,
          qty: item.qty,
        })),
      };

      const orderRes = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      });

      if (!orderRes.ok) {
        const json = await orderRes.json().catch(() => ({}));
        await fetch(`/api/reservations/${res.id}`, { method: "DELETE" }).catch(() => {});
        throw new Error(json?.error ?? "Gagal mencatat pesanan awal reservasi");
      }

      const orderJson = await orderRes.json();
      const orderDbId = orderJson?.data?.order_id;

      // 3. Link orderId and deposit details to reservation
      await updateReservation(res.id, {
        orderId: orderDbId,
        depositAmount: preOrderTotal,
        depositMethod,
      });

      toast.success("Reservasi & Deposit berhasil dibuat!");
      setCreateOpen(false);
      resetForm();
      mutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal membuat reservasi");
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setCreateStep(1);
    setCustName("");
    setCustPhone("");
    setNotes("");
    setPreOrderItems([]);
    setAmountInput("");
  }

  const dayReservations = reservations.filter(
    (r) => r.reservationDate === selectedDate && r.floorNumber === activeFloor,
  );

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Top Bar Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => shiftWeek(-7)}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                onClick={() => setSelectedDate(todayWIB())}
              >
                Hari Ini
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => shiftWeek(7)}
              >
                <ChevronRight className="size-4" />
              </Button>
              <span className="text-sm font-semibold ml-1">
                {formatDateLong(selectedDate)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="h-10"
                onClick={() => {
                  setMinSpendInput(String(minSpendAmount));
                  setSettingsOpen(true);
                }}
              >
                <Settings className="size-4 mr-1.5" />
                Minimum Spend
              </Button>

              <Button
                className="h-10"
                onClick={() => {
                  resetForm();
                  setResDate(selectedDate);
                  setResFloor(activeFloor);
                  setCreateOpen(true);
                }}
              >
                <Plus className="size-4 mr-1.5" />
                Buat Reservasi
              </Button>
            </div>
          </div>

          {/* Weekday Strip */}
          <Card className="p-1.5 sm:p-2">
            <div className="grid grid-cols-7 gap-1">
              {weekDays.map((d) => (
                <button
                  key={d.date}
                  type="button"
                  onClick={() => setSelectedDate(d.date)}
                  className={cn(
                    "flex flex-col items-center justify-center p-2 rounded-lg transition-colors text-xs sm:text-sm",
                    selectedDate === d.date
                      ? "bg-primary text-primary-foreground font-bold shadow-sm"
                      : "hover:bg-accent text-muted-foreground",
                    d.isToday && selectedDate !== d.date
                      ? "border border-primary text-primary font-semibold"
                      : "border border-transparent",
                  )}
                >
                  <span className="text-[11px] opacity-80">{d.dayName}</span>
                  <span className="text-base sm:text-lg">{d.dayNum}</span>
                </button>
              ))}
            </div>
          </Card>

          {/* Floor Switcher Tabs */}
          <Tabs
            value={String(activeFloor)}
            onValueChange={(v) => setActiveFloor(Number(v))}
            className="w-full"
          >
            <TabsList className="grid grid-cols-3 h-10 w-full sm:w-80">
              {FLOORS.map((f) => (
                <TabsTrigger key={f} value={String(f)} className="text-xs sm:text-sm font-semibold">
                  Lantai {f}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* Timeline / Reservation Cards List */}
          <Card className="flex-1 p-4 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Memuat jadwal reservasi...
              </div>
            ) : dayReservations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <CalendarIcon className="size-10 text-muted-foreground/50 mb-2" />
                <p className="font-semibold text-sm">Tidak ada reservasi</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Lantai {activeFloor} belum memiliki reservasi pada {formatDateLong(selectedDate)}.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {dayReservations.map((res) => (
                  <div
                    key={res.id}
                    onClick={() => setDetailRes(res)}
                    className={cn(
                      "flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border transition-all cursor-pointer hover:shadow-md",
                      STATUS_COLOR[res.status],
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-background/80 font-bold text-sm">
                        L{res.floorNumber}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm truncate">{res.customerName}</p>
                          <Badge variant="outline" className="text-[10px] bg-background/60 font-semibold">
                            {res.status}
                          </Badge>
                        </div>
                        <p className="text-xs opacity-90 mt-0.5 flex items-center gap-1.5">
                          <Clock className="size-3 shrink-0" />
                          {res.startTime} – {res.endTime}
                          {res.customerPhone && <> &middot; {res.customerPhone}</>}
                        </p>
                      </div>
                    </div>

                    <div className="text-right text-xs">
                      <p className="font-semibold">Deposit {formatRupiah(res.depositAmount)}</p>
                      <p className="opacity-80 text-[11px]">{res.depositMethod ?? "TUNAI"}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
      {/* Dialog: Settings for Global Minimum Spend */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pengaturan Minimum Spend</DialogTitle>
            <DialogDescription>
              Atur nilai minimum pesanan (minimum spend) yang berlaku untuk seluruh reservasi tempat.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-2">
            <Label htmlFor="min-spend">Minimum Spend (Rp)</Label>
            <Input
              id="min-spend"
              type="number"
              placeholder="0"
              value={minSpendInput}
              onChange={(e) => setMinSpendInput(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>
              Batal
            </Button>
            <Button disabled={savingSettings} onClick={handleSaveSettings}>
              {savingSettings && <Loader2 className="size-4 animate-spin mr-1.5" />}
              Simpan Pengaturan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Create Reservation (Multi-step) */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85dvh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Buat Reservasi Baru ({createStep}/4)</DialogTitle>
            <DialogDescription>
              {createStep === 1 && "Langkah 1: Informasi Pelanggan"}
              {createStep === 2 && "Langkah 2: Tanggal, Waktu & Lantai"}
              {createStep === 3 && "Langkah 3: Pre-Order Menu (Wajib ≥ Minimum Spend)"}
              {createStep === 4 && "Langkah 4: Konfirmasi & Pembayaran Uang Muka (Deposit)"}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto min-h-0 py-2">
            {createStep === 1 && (
              <div className="flex flex-col gap-3 text-xs sm:text-sm">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="c-name">Nama Pelanggan *</Label>
                  <Input
                    id="c-name"
                    placeholder="Mis. Pak Budi"
                    value={custName}
                    onChange={(e) => setCustName(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="c-phone">Nomor Telepon / WA (Opsional)</Label>
                  <Input
                    id="c-phone"
                    placeholder="0812..."
                    value={custPhone}
                    onChange={(e) => setCustPhone(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="c-notes">Catatan Reservasi (Opsional)</Label>
                  <Input
                    id="c-notes"
                    placeholder="Mis. Ulang tahun / butuh stopkontak..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
            )}

            {createStep === 2 && (
              <div className="flex flex-col gap-3 text-xs sm:text-sm">
                <div className="flex flex-col gap-1.5">
                  <Label>Tanggal Reservasi</Label>
                  <Input
                    type="date"
                    value={resDate}
                    onChange={(e) => setResDate(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label>Jam Mulai</Label>
                    <Input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Jam Selesai</Label>
                    <Input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label>Lantai Reservasi</Label>
                  <Tabs
                    value={String(resFloor)}
                    onValueChange={(v) => setResFloor(Number(v))}
                  >
                    <TabsList className="grid grid-cols-3 h-10 w-full">
                      {FLOORS.map((f) => (
                        <TabsTrigger key={f} value={String(f)}>
                          Lantai {f}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                </div>
              </div>
            )}

            {createStep === 3 && (
              <div className="flex flex-col gap-3">
                <div className="rounded-lg border bg-accent/40 p-3 text-xs flex justify-between items-center">
                  <div>
                    <p className="font-medium text-muted-foreground">Ketentuan Minimum Spend</p>
                    <p className="font-bold text-sm text-foreground">
                      {formatRupiah(minSpendAmount)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-muted-foreground">Total Pre-Order</p>
                    <p className={cn("font-bold text-sm", preOrderTotal >= minSpendAmount ? "text-success" : "text-warning")}>
                      {formatRupiah(preOrderTotal)}
                    </p>
                  </div>
                </div>

                {preOrderTotal < minSpendAmount && (
                  <p className="text-xs text-warning font-medium">
                    * Total pre-order belum mencapai minimum spend {formatRupiah(minSpendAmount)}. Tambahkan menu lagi untuk melanjutkan.
                  </p>
                )}

                <div className="flex flex-col gap-2 max-h-60 overflow-y-auto border rounded-lg p-2">
                  {menuProducts.map((p) => {
                    const line = preOrderItems.find((i) => i.product.id === p.id);
                    const qty = line?.qty ?? 0;
                    return (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 text-xs sm:text-sm"
                      >
                        <div>
                          <p className="font-semibold">{p.name}</p>
                          <p className="text-muted-foreground">{formatRupiah(p.price)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {qty > 0 && (
                            <Button
                              size="icon"
                              variant="outline"
                              className="size-7"
                              onClick={() => {
                                setPreOrderItems((prev) =>
                                  prev
                                    .map((i) =>
                                      i.product.id === p.id
                                        ? { ...i, qty: i.qty - 1 }
                                        : i,
                                    )
                                    .filter((i) => i.qty > 0),
                                );
                              }}
                            >
                              -
                            </Button>
                          )}
                          {qty > 0 && <span className="font-semibold">{qty}</span>}
                          <Button
                            size="icon"
                            variant="outline"
                            className="size-7"
                            onClick={() => {
                              setPreOrderItems((prev) => {
                                const exists = prev.find((i) => i.product.id === p.id);
                                if (exists) {
                                  return prev.map((i) =>
                                    i.product.id === p.id
                                      ? { ...i, qty: i.qty + 1 }
                                      : i,
                                  );
                                }
                                return [...prev, { product: p, qty: 1 }];
                              });
                            }}
                          >
                            +
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {createStep === 4 && (
              <div className="flex flex-col gap-3 text-xs sm:text-sm">
                <div className="rounded-lg border p-3 bg-muted/30 flex flex-col gap-1.5">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pemesan:</span>
                    <span className="font-semibold">{custName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Waktu:</span>
                    <span className="font-semibold">
                      Lantai {resFloor} &middot; {resDate} ({startTime}-{endTime})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Pre-Order / Deposit:</span>
                    <span className="font-bold text-primary">{formatRupiah(preOrderTotal)}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 mt-1">
                  <Label>Metode Pembayaran Deposit</Label>
                  <Tabs
                    value={depositMethod}
                    onValueChange={(v) => setDepositMethod(v as "TUNAI" | "QRIS" | "TRANSFER")}
                  >
                    <TabsList className="grid grid-cols-3 h-10 w-full mb-3">
                      <TabsTrigger value="TUNAI" className="text-xs">Tunai</TabsTrigger>
                      <TabsTrigger value="QRIS" className="text-xs">QRIS</TabsTrigger>
                      <TabsTrigger value="TRANSFER" className="text-xs">Transfer</TabsTrigger>
                    </TabsList>
                  </Tabs>

                  {depositMethod === "TUNAI" ? (
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="cash-amount">Uang diterima</Label>
                        <Input
                          id="cash-amount"
                          type="number"
                          inputMode="numeric"
                          min={0}
                          placeholder="0"
                          value={amountInput}
                          onChange={(e) => setAmountInput(e.target.value)}
                          className="h-10 text-base font-semibold"
                        />
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {cashSuggestions.map((amount) => (
                          <Button
                            key={amount}
                            type="button"
                            variant="outline"
                            className="h-8.5 px-3 text-xs font-medium"
                            onClick={() => setAmountInput(String(amount))}
                          >
                            {amount === preOrderTotal ? "Uang Pas" : formatRupiah(amount)}
                          </Button>
                        ))}
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-muted p-2.5">
                        <span className="text-xs font-medium">Kembalian</span>
                        <span className={isSufficient ? "text-sm font-semibold" : "text-xs font-medium text-muted-foreground"}>
                          {amountPaidNum === 0 ? "-" : isSufficient ? formatRupiah(change) : `Kurang ${formatRupiah(Math.abs(change))}`}
                        </span>
                      </div>
                    </div>
                  ) : depositMethod === "QRIS" ? (
                    <ManualPaymentPanel
                      total={preOrderTotal}
                      icon={<QrCode className="size-5" />}
                      hint="Minta pelanggan scan QRIS statis warung dan bayar sesuai nominal di atas. Setelah dana masuk, simpan reservasi."
                    />
                  ) : (
                    <ManualPaymentPanel
                      total={preOrderTotal}
                      icon={<Landmark className="size-5" />}
                      hint="Minta pelanggan transfer ke rekening warung sesuai nominal di atas. Setelah mutasi masuk, simpan reservasi."
                    />
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            {createStep > 1 && (
              <Button
                variant="outline"
                disabled={submitting}
                onClick={() => setCreateStep((s) => (s - 1) as 1 | 2 | 3)}
              >
                Kembali
              </Button>
            )}

            {createStep < 4 ? (
              <Button
                disabled={
                  (createStep === 1 && !custName.trim()) ||
                  (createStep === 3 && preOrderTotal < minSpendAmount)
                }
                onClick={() => setCreateStep((s) => (s + 1) as 2 | 3 | 4)}
              >
                Lanjut
              </Button>
            ) : (
              <Button disabled={submitting || !isSufficient} onClick={handleCreateReservation}>
                {submitting && <Loader2 className="size-4 animate-spin mr-1.5" />}
                Konfirmasi &amp; Simpan Reservasi
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Detail Reservation */}
      <Dialog open={detailRes !== null} onOpenChange={(o) => !o && setDetailRes(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Detail Reservasi #{detailRes?.id.slice(0, 8)}</DialogTitle>
            <DialogDescription>
              Informasi lengkap reservasi & status.
            </DialogDescription>
          </DialogHeader>

          {detailRes && (
            <div className="flex flex-col gap-3 py-2 text-xs sm:text-sm">
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Pelanggan:</span>
                <span className="font-bold">{detailRes.customerName}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Lantai &amp; Waktu:</span>
                <span className="font-semibold">
                  Lantai {detailRes.floorNumber} &middot; {detailRes.startTime}-{detailRes.endTime}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Deposit Paid:</span>
                <span className="font-bold text-success">
                  {formatRupiah(detailRes.depositAmount)} ({detailRes.depositMethod ?? "TUNAI"})
                </span>
              </div>
              {detailRes.notes && (
                <div className="border-b pb-2">
                  <span className="text-muted-foreground block">Catatan:</span>
                  <span className="italic">{detailRes.notes}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-1">
                <span className="text-muted-foreground">Status:</span>
                <Badge className={STATUS_COLOR[detailRes.status]}>{detailRes.status}</Badge>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailRes(null)}>
              Tutup
            </Button>
            {detailRes?.status === "CONFIRMED" && (
              <Button
                variant="destructive"
                onClick={async () => {
                  if (!detailRes) return;
                  await updateReservation(detailRes.id, { status: "CANCELLED" });
                  toast.success("Reservasi dibatalkan");
                  setDetailRes(null);
                  mutate();
                }}
              >
                Batalkan Reservasi
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
