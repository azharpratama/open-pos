"use client";

import { useMemo, useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
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
import { Landmark, Loader2, QrCode } from "lucide-react";

import { ManualPaymentPanel } from "@/components/kasir/manual-payment-panel";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";

type PaymentMethod = "TUNAI" | "QRIS" | "TRANSFER" | "OPEN_BILL";

type PaymentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  submitting?: boolean;
  cashiers: string[];
  onCashConfirmed: (
    amountPaid: number,
    change: number,
    customerName: string,
    cashierName: string,
    discount: number,
  ) => void;
  onManualPaid: (
    method: "QRIS" | "TRANSFER" | "OPEN_BILL",
    customerName: string,
    cashierName: string,
    discount: number,
  ) => void;
  mode?: "CREATE" | "CLOSE_BILL";
  defaultCustomerName?: string;
  defaultCashierName?: string;
  defaultDiscount?: number;
};

type DiscountMode = "RUPIAH" | "PERCENT";

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

export function PaymentDialog({
  open,
  onOpenChange,
  total,
  submitting = false,
  cashiers,
  onCashConfirmed,
  onManualPaid,
  mode = "CREATE",
  defaultCustomerName = "",
  defaultCashierName = "",
  defaultDiscount = 0,
}: PaymentDialogProps) {
  const [method, setMethod] = useState<PaymentMethod>("TUNAI");
  const [amountInput, setAmountInput] = useState("");
  const [customerName, setCustomerName] = useState(defaultCustomerName);
  const [discountMode, setDiscountMode] = useState<DiscountMode>("RUPIAH");
  const [discountInput, setDiscountInput] = useState(defaultDiscount ? String(defaultDiscount) : "");
  // Auto-select when only one cashier is on the roster; otherwise force a pick.
  const [cashierName, setCashierName] = useState(() =>
    defaultCashierName ? defaultCashierName : cashiers.length === 1 ? cashiers[0] : "",
  );

  useEffect(() => {
    if (cashiers.length === 1 && !cashierName) {
      setCashierName(cashiers[0]);
    }
  }, [cashiers, cashierName]);

  useEffect(() => {
    if (open) {
      if (defaultCustomerName) setCustomerName(defaultCustomerName);
      if (defaultCashierName) setCashierName(defaultCashierName);
      if (defaultDiscount) setDiscountInput(String(defaultDiscount));
    }
  }, [open, defaultCustomerName, defaultCashierName, defaultDiscount]);

  // Discount entered as a % of the bill or a flat Rp, clamped to [0, total].
  const discountValue = Number(discountInput) || 0;
  const rawDiscount =
    discountMode === "PERCENT"
      ? Math.round((total * discountValue) / 100)
      : Math.round(discountValue);
  const discount = Math.max(0, Math.min(rawDiscount, total));
  const payable = total - discount;

  const amountPaid = Number(amountInput) || 0;
  const change = amountPaid - payable;
  const isSufficient = amountPaid >= payable;
  const hasName = customerName.trim().length > 0;
  const hasCashier = cashierName.trim().length > 0;
  const suggestions = useMemo(() => suggestCashAmounts(payable), [payable]);

  function handleConfirm() {
    if (!isSufficient || !hasName || !hasCashier) return;
    onCashConfirmed(amountPaid, change, customerName.trim(), cashierName, discount);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 p-4 sm:p-5 sm:max-w-md">
        <DialogHeader className="shrink-0 pb-3">
          <DialogTitle>Pembayaran</DialogTitle>
          <DialogDescription>
            Total tagihan {formatRupiah(total)}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-1.5 -m-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="customer-name">Nama Pemesan</Label>
            <Input
              id="customer-name"
              placeholder="Mis. Tito Tikoessss"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              autoFocus
              className="h-10 text-xs sm:text-sm"
            />
            {!hasName && (
              <p className="text-[11px] text-muted-foreground">
                Nama pemesan wajib diisi sebelum konfirmasi pembayaran.
              </p>
            )}
          </div>


          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cashier-name">Nama Kasir</Label>
            <select
              id="cashier-name"
              value={cashierName}
              onChange={(e) => setCashierName(e.target.value)}
              disabled={cashiers.length === 0}
              className="h-10 rounded-md border border-input bg-transparent px-3 text-xs sm:text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="" disabled>
                {cashiers.length === 0 ? "Belum ada kasir hari ini" : "Pilih kasir..."}
              </option>
              {cashiers.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            {cashiers.length === 0 && (
              <p className="text-[11px] text-muted-foreground">
                Belum ada kasir untuk hari ini. Minta owner mengaturnya di dashboard.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="discount-value">Diskon (opsional)</Label>
            <div className="flex gap-2">
              <div className="flex shrink-0 rounded-md border border-input p-0.5">
                {(["RUPIAH", "PERCENT"] as DiscountMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setDiscountMode(mode)}
                    className={cn(
                      "flex h-9 w-11 items-center justify-center rounded-md text-xs font-medium transition-colors",
                      discountMode === mode
                        ? "bg-accent text-accent-foreground font-semibold"
                        : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {mode === "RUPIAH" ? "Rp" : "%"}
                  </button>
                ))}
              </div>
              <Input
                id="discount-value"
                type="number"
                inputMode="numeric"
                min={0}
                max={discountMode === "PERCENT" ? 100 : undefined}
                placeholder={discountMode === "PERCENT" ? "0 %" : "0"}
                value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value)}
                className="h-10 text-xs sm:text-sm"
              />
            </div>
            {discount > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Potongan</span>
                <span className="font-medium text-destructive">
                  - {formatRupiah(discount)}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg border bg-muted/50 px-3 py-2">
            <span className="text-xs font-medium">Total bayar</span>
            <span className="text-base font-bold tabular-nums">
              {formatRupiah(payable)}
            </span>
          </div>

          <Tabs value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
            <TabsList className={cn("h-10 w-full grid", mode === "CLOSE_BILL" ? "grid-cols-3" : "grid-cols-4")}>
              <TabsTrigger value="TUNAI" className="text-xs">Tunai</TabsTrigger>
              <TabsTrigger value="QRIS" className="text-xs">QRIS</TabsTrigger>
              <TabsTrigger value="TRANSFER" className="text-xs">Transfer</TabsTrigger>
              {mode !== "CLOSE_BILL" && (
                <TabsTrigger value="OPEN_BILL" className="text-xs">Open Bill</TabsTrigger>
              )}
            </TabsList>
          </Tabs>

          {method === "TUNAI" ? (
            <div className="flex h-[152px] flex-col justify-between">
              {/* Moved customerName to top */}
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
                {suggestions.map((amount) => (
                  <Button
                    key={amount}
                    type="button"
                    variant="outline"
                    className="h-8.5 px-3 text-xs font-medium"
                    onClick={() => setAmountInput(String(amount))}
                  >
                    {amount === total ? "Uang Pas" : formatRupiah(amount)}
                  </Button>
                ))}
              </div>

              <div className="flex items-center justify-between rounded-lg bg-muted p-2.5">
                <span className="text-xs font-medium">Kembalian</span>
                <span
                  className={
                    isSufficient
                      ? "text-sm font-semibold"
                      : "text-xs font-medium text-muted-foreground"
                  }
                >
                  {amountPaid === 0
                    ? "-"
                    : isSufficient
                      ? formatRupiah(change)
                      : `Kurang ${formatRupiah(Math.abs(change))}`}
                </span>
              </div>
            </div>
          ) : method === "QRIS" ? (
            <ManualPaymentPanel
              total={payable}
              icon={<QrCode className="size-5" />}
              hint="Minta pelanggan scan QRIS statis warung dan bayar sesuai nominal di atas. Setelah dana masuk, tekan tombol untuk mencatat pembayaran."
            />
          ) : method === "TRANSFER" ? (
            <ManualPaymentPanel
              total={payable}
              icon={<Landmark className="size-5" />}
              hint="Minta pelanggan transfer ke rekening warung sesuai nominal di atas. Setelah bukti/mutasi masuk, tekan tombol untuk mencatat pembayaran."
            />
          ) : (
            <div className="flex flex-col gap-3 rounded-lg border bg-warning-subtle p-3.5 text-xs text-warning-foreground border border-warning-border">
              <p className="font-semibold text-sm">Tagihan Terbuka (Open Bill)</p>
              <p className="text-muted-foreground leading-relaxed">
                Pesanan akan dicatat sebagai tagihan terbuka dengan status pembayaran tertunda. Pelanggan dapat memesan menu tambahan sewaktu-waktu dan melunasi tagihan di akhir.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 pt-3">
          {method === "TUNAI" ? (
            <Button
              type="button"
              className="h-11 w-full rounded-xl text-base font-semibold"
              disabled={!isSufficient || !hasName || !hasCashier || submitting}
              onClick={handleConfirm}
            >
              {submitting && <Loader2 className="size-5 animate-spin" />}
              Konfirmasi Pembayaran
            </Button>
          ) : method === "OPEN_BILL" ? (
            <Button
              type="button"
              className="h-11 w-full rounded-xl text-base font-semibold bg-warning text-primary-foreground hover:bg-warning/85"
              disabled={!hasName || !hasCashier || submitting}
              onClick={() =>
                onManualPaid("OPEN_BILL", customerName.trim(), cashierName, discount)
              }
            >
              {submitting && <Loader2 className="size-5 animate-spin" />}
              Buka Tagihan
            </Button>
          ) : (
            <Button
              type="button"
              className="h-11 w-full rounded-xl text-base font-semibold"
              disabled={!hasName || !hasCashier || submitting}
              onClick={() =>
                onManualPaid(method, customerName.trim(), cashierName, discount)
              }
            >
              {submitting && <Loader2 className="size-5 animate-spin" />}
              Konfirmasi Pembayaran
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
