"use client";

import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import useSWR from "swr";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateLong, formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import { fetchInventory } from "@/lib/inventory";
import { fetchSuppliers } from "@/lib/suppliers";
import {
  fetchPurchases,
  recordPurchase,
  type Purchase,
  type PurchaseItem,
} from "@/lib/purchases";
import { fetchExpenses, recordExpense, type Expense } from "@/lib/expenses";

type BahanRow = { productId: string; qty: string; unitCost: string };
type Mode = "bahan" | "operasional";

const SELECT_CLASS =
  "h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50";

function itemsSummary(items: PurchaseItem[]): string {
  return items.map((it) => `${it.qty}× ${it.name}`).join(", ");
}

type CombinedEntry =
  | (Purchase & { _type: "bahan" | "gaji" })
  | (Expense & { _type: "operasional" });

export function PurchaseManager() {
  // --- Data fetching ---
  const {
    data: purchases = [],
    error: purchaseError,
    isLoading: purchaseLoading,
    mutate: mutatePurchases,
  } = useSWR("/api/purchases", fetchPurchases);
  const {
    data: expenses = [],
    error: expenseError,
    isLoading: expenseLoading,
    mutate: mutateExpenses,
  } = useSWR("/api/expenses", fetchExpenses);
  const { data: suppliers = [], isLoading: supplierLoading } = useSWR(
    "/api/suppliers",
    fetchSuppliers,
  );
  const { data: inventory = [], isLoading: inventoryLoading, mutate: mutateInventory } = useSWR(
    "/api/inventory",
    fetchInventory,
  );

  const loading =
    purchaseLoading || expenseLoading || supplierLoading || inventoryLoading;
  const errorMsg =
    purchaseError || expenseError
      ? (purchaseError ?? expenseError) instanceof Error
        ? ((purchaseError ?? expenseError) as Error).message
        : "Gagal memuat data"
      : null;

  // Merge and sort by date descending
  const allEntries: CombinedEntry[] = [
    ...purchases.map((p) => ({ ...p, _type: p.kind as "bahan" | "gaji" })),
    ...expenses.map((e) => ({ ...e, _type: "operasional" as const })),
  ].sort((a, b) => {
    const dateA = "purchaseDate" in a ? a.purchaseDate : "";
    const dateB = "purchaseDate" in b ? b.purchaseDate : "";
    return dateB.localeCompare(dateA);
  });

  // --- Dialog state ---
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("bahan");

  // Bahan Baku state
  const [supplierId, setSupplierId] = useState("");
  const [note, setNote] = useState("");
  const [rows, setRows] = useState<BahanRow[]>([
    { productId: "", qty: "", unitCost: "" },
  ]);

  // Beban Operasional state
  const [expSupplierId, setExpSupplierId] = useState("");
  const [expNote, setExpNote] = useState("");
  const [expTotal, setExpTotal] = useState("");
  const [expDate, setExpDate] = useState(
    () =>
      new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" }),
  );

  const [saving, setSaving] = useState(false);

  function openDialog() {
    setMode("bahan");
    setSupplierId("");
    setNote("");
    setRows([{ productId: "", qty: "", unitCost: "" }]);
    setExpSupplierId("");
    setExpNote("");
    setExpTotal("");
    setExpDate(
      new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" }),
    );
    setOpen(true);
  }

  // Bahan rows helpers
  function setRow(index: number, patch: Partial<BahanRow>) {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    );
  }
  function addRow() {
    setRows((prev) => [...prev, { productId: "", qty: "", unitCost: "" }]);
  }
  function removeRow(index: number) {
    setRows((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  const bahanTotal = rows.reduce(
    (sum, r) => sum + (Number(r.qty) || 0) * (Number(r.unitCost) || 0),
    0,
  );
  const validRows = rows.filter((r) => r.productId && Number(r.qty) > 0);
  const canSubmitBahan = validRows.length > 0 && supplierId !== "";
  const canSubmitExp = expNote.trim().length > 0 && Number(expTotal) > 0;

  async function handleSubmit() {
    if (saving) return;
    setSaving(true);
    try {
      if (mode === "bahan") {
        if (!canSubmitBahan) return;
        await recordPurchase(
          supplierId || null,
          note.trim() || null,
          validRows.map((r) => ({
            productId: r.productId,
            qty: Number(r.qty),
            unitCost: Number(r.unitCost) || 0,
          })),
        );
        toast.success("Pembelian dicatat — stok bahan bertambah");
        mutatePurchases();
        mutateInventory();
      } else {
        if (!canSubmitExp) return;
        await recordExpense({
          supplierId: expSupplierId || null,
          note: expNote.trim(),
          total: Number(expTotal),
          purchaseDate: expDate,
        });
        toast.success("Pengeluaran operasional dicatat");
        mutateExpenses();
      }
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  const canSubmit = mode === "bahan" ? canSubmitBahan : canSubmitExp;

  // --- Kind badge helper ---
  function KindBadge({ kind }: { kind: string }) {
    if (kind === "gaji")
      return (
        <Badge variant="warning" className="text-[11px]">
          Gaji
        </Badge>
      );
    if (kind === "operasional")
      return (
        <Badge variant="info" className="text-[11px]">
          Operasional
        </Badge>
      );
    return (
      <Badge variant="success" className="text-[11px]">
        Bahan
      </Badge>
    );
  }

  return (
    <Card className="gap-4 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold leading-tight">Pengeluaran</p>
          <p className="text-xs text-muted-foreground">
            Pembelian bahan & biaya operasional (listrik, WiFi, dll)
          </p>
        </div>
        <Button
          type="button"
          className="h-9 px-3.5 text-xs sm:text-sm font-medium"
          onClick={openDialog}
        >
          <Plus className="size-4" />
          Catat Pengeluaran
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Memuat...
        </div>
      ) : errorMsg ? (
        <p className="py-8 text-center text-sm text-destructive">{errorMsg}</p>
      ) : allEntries.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Belum ada pengeluaran tercatat.
        </p>
      ) : (
        <div className="-mx-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-y bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-2.5 font-medium">Tanggal</th>
                <th className="px-5 py-2.5 font-medium">Jenis</th>
                <th className="px-5 py-2.5 font-medium">Supplier / Keterangan</th>
                <th className="px-5 py-2.5 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {allEntries.map((entry) => {
                const isBahanOrGaji = entry._type === "bahan" || entry._type === "gaji";
                const p = isBahanOrGaji ? (entry as Purchase & { _type: string }) : null;
                const ex = !isBahanOrGaji ? (entry as Expense & { _type: string }) : null;

                return (
                  <tr key={entry.id} className="hover:bg-muted/30">
                    <td className="px-5 py-2.5 whitespace-nowrap text-muted-foreground">
                      {formatDateLong(entry.purchaseDate)}
                    </td>
                    <td className="px-5 py-2.5">
                      <KindBadge kind={entry._type} />
                    </td>
                    <td className="px-5 py-2.5 text-muted-foreground">
                      {p ? (
                        p.kind === "gaji" ? (
                          p.note ?? "Gaji karyawan"
                        ) : (
                          <div className="flex flex-col">
                            <span className="text-foreground">
                              {p.supplierName ?? (
                                <span className="text-muted-foreground/70 italic">
                                  Tanpa supplier
                                </span>
                              )}
                            </span>
                            {p.items.length > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {itemsSummary(p.items)}
                              </span>
                            )}
                            {p.note && (
                              <span className="text-xs text-muted-foreground">
                                {p.note}
                              </span>
                            )}
                          </div>
                        )
                      ) : (
                        <div className="flex flex-col">
                          {ex?.supplierName && (
                            <span className="text-foreground">{ex.supplierName}</span>
                          )}
                          <span className={ex?.supplierName ? "text-xs text-muted-foreground" : ""}>
                            {ex?.note ?? "—"}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-2.5 text-right font-medium tabular-nums">
                      {formatRupiah(entry.total)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Catat Pengeluaran</DialogTitle>
          </DialogHeader>

          {/* Mode toggle */}
          <div className="flex rounded-lg border p-1 gap-1">
            <button
              type="button"
              onClick={() => setMode("bahan")}
              className={cn(
                "flex h-9 flex-1 items-center justify-center rounded-md px-3 text-xs sm:text-sm font-medium transition-colors",
                mode === "bahan"
                  ? "bg-accent text-accent-foreground font-semibold shadow-sm"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              Bahan Baku
            </button>
            <button
              type="button"
              onClick={() => setMode("operasional")}
              className={cn(
                "flex h-9 flex-1 items-center justify-center rounded-md px-3 text-xs sm:text-sm font-medium transition-colors",
                mode === "operasional"
                  ? "bg-accent text-accent-foreground font-semibold shadow-sm"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              Beban Operasional
            </button>
          </div>

          {mode === "bahan" ? (
            <div className="flex flex-col gap-3">
              {/* Supplier (required for bahan) */}
              <div className="flex flex-col gap-1.5">
                <Label>
                  Supplier <span className="text-destructive">*</span>
                </Label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className={SELECT_CLASS}
                  disabled={suppliers.length === 0}
                >
                  <option value="" disabled>
                    {suppliers.length === 0 ? "Belum ada supplier" : "Pilih supplier"}
                  </option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                {suppliers.length === 0 && (
                  <p className="text-xs text-destructive">
                    Tambah supplier dulu di daftar Supplier sebelum mencatat pembelian.
                  </p>
                )}
              </div>

              {/* Items */}
              <div className="flex flex-col gap-2">
                <Label>Item</Label>
                {rows.map((row, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <select
                      value={row.productId}
                      onChange={(e) => setRow(i, { productId: e.target.value })}
                      className={`${SELECT_CLASS} flex-1`}
                    >
                      <option value="" disabled>
                        {inventory.length === 0 ? "Belum ada bahan" : "Pilih bahan"}
                      </option>
                      {inventory.map((inv) => (
                        <option key={inv.id} value={inv.id}>
                          {inv.name} ({inv.unitType})
                        </option>
                      ))}
                    </select>
                    <Input
                      type="number"
                      min={0}
                      value={row.qty}
                      onChange={(e) => setRow(i, { qty: e.target.value })}
                      placeholder="Qty"
                      className="h-10 w-16"
                    />
                    <Input
                      type="number"
                      min={0}
                      value={row.unitCost}
                      onChange={(e) => setRow(i, { unitCost: e.target.value })}
                      placeholder="Harga"
                      className="h-10 w-24"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="shrink-0 text-muted-foreground"
                      onClick={() => removeRow(i)}
                      aria-label="Hapus item"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 self-start px-3 text-xs sm:text-sm font-medium"
                  onClick={addRow}
                >
                  <Plus className="size-4" />
                  Tambah item
                </Button>
              </div>

              {/* Note */}
              <div className="flex flex-col gap-1.5">
                <Label>Catatan (opsional)</Label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder="Mis. nota #123, beli di pasar pagi"
                  className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
              </div>

              <div className="flex items-center justify-between rounded-lg bg-muted p-3 text-sm">
                <span className="font-medium">Total</span>
                <span className="font-semibold tabular-nums">{formatRupiah(bahanTotal)}</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {/* Supplier (optional for operasional) */}
              <div className="flex flex-col gap-1.5">
                <Label>
                  Supplier{" "}
                  <span className="text-muted-foreground text-xs">(opsional)</span>
                </Label>
                <select
                  value={expSupplierId}
                  onChange={(e) => setExpSupplierId(e.target.value)}
                  className={SELECT_CLASS}
                >
                  <option value="">Tanpa supplier / tidak diketahui</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Keterangan */}
              <div className="flex flex-col gap-1.5">
                <Label>
                  Keterangan <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={expNote}
                  onChange={(e) => setExpNote(e.target.value)}
                  placeholder="Mis. Tagihan WiFi Juli, Bayar Listrik"
                />
              </div>

              {/* Amount */}
              <div className="flex flex-col gap-1.5">
                <Label>
                  Jumlah (Rp) <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="number"
                  min={1}
                  value={expTotal}
                  onChange={(e) => setExpTotal(e.target.value)}
                  placeholder="Mis. 350000"
                />
              </div>

              {/* Date */}
              <div className="flex flex-col gap-1.5">
                <Label>Tanggal</Label>
                <Input
                  type="date"
                  value={expDate}
                  onChange={(e) => setExpDate(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="h-9 px-4 text-xs sm:text-sm font-medium"
              disabled={saving}
              onClick={() => setOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="button"
              className="h-9 px-4 text-xs sm:text-sm font-semibold"
              disabled={!canSubmit || saving}
              onClick={handleSubmit}
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              {mode === "bahan" ? "Simpan Pembelian" : "Simpan Pengeluaran"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
