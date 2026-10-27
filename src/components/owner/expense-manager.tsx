"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import useSWR from "swr";

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
import { fetchSuppliers } from "@/lib/suppliers";
import { fetchExpenses, recordExpense } from "@/lib/expenses";

const SELECT_CLASS =
  "h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50";

export function ExpenseManager() {
  const {
    data: expenses = [],
    error,
    isLoading,
    mutate,
  } = useSWR("/api/expenses", fetchExpenses);
  const { data: suppliers = [] } = useSWR("/api/suppliers", fetchSuppliers);

  const [open, setOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [note, setNote] = useState("");
  const [total, setTotal] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(
    () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" }),
  );
  const [saving, setSaving] = useState(false);

  function openDialog() {
    setSupplierId("");
    setNote("");
    setTotal("");
    setPurchaseDate(
      new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" }),
    );
    setOpen(true);
  }

  const canSubmit = note.trim().length > 0 && Number(total) > 0;

  async function handleSubmit() {
    if (!canSubmit || saving) return;
    setSaving(true);
    try {
      await recordExpense({
        supplierId: supplierId || null,
        note: note.trim(),
        total: Number(total),
        purchaseDate,
      });
      toast.success("Pengeluaran berhasil dicatat");
      setOpen(false);
      mutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mencatat pengeluaran");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="gap-4 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold leading-tight">Beban Operasional</p>
          <p className="text-xs text-muted-foreground">
            Tagihan listrik, air, WiFi, dan pengeluaran rutin lainnya
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

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Memuat...
        </div>
      ) : error ? (
        <p className="py-8 text-center text-sm text-destructive">
          {error instanceof Error ? error.message : "Gagal memuat data"}
        </p>
      ) : expenses.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Belum ada pengeluaran operasional tercatat.
        </p>
      ) : (
        <div className="-mx-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-y bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-2.5 font-medium">Tanggal</th>
                <th className="px-5 py-2.5 font-medium">Supplier</th>
                <th className="px-5 py-2.5 font-medium">Keterangan</th>
                <th className="px-5 py-2.5 text-right font-medium">Jumlah</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {expenses.map((e) => (
                <tr key={e.id} className="hover:bg-muted/30">
                  <td className="px-5 py-2.5 whitespace-nowrap text-muted-foreground">
                    {formatDateLong(e.purchaseDate)}
                  </td>
                  <td className="px-5 py-2.5 text-muted-foreground">
                    {e.supplierName ?? (
                      <span className="text-muted-foreground/70 italic">
                        Tanpa supplier
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-2.5">
                    {e.note ?? (
                      <span className="text-muted-foreground/70 italic">—</span>
                    )}
                  </td>
                  <td className="px-5 py-2.5 text-right font-medium tabular-nums">
                    {formatRupiah(e.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Catat Pengeluaran Operasional</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            {/* Supplier (optional) */}
            <div className="flex flex-col gap-1.5">
              <Label>
                Supplier{" "}
                <span className="text-muted-foreground text-xs">(opsional)</span>
              </Label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
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

            {/* Keterangan (required) */}
            <div className="flex flex-col gap-1.5">
              <Label>
                Keterangan <span className="text-destructive">*</span>
              </Label>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Mis. Tagihan WiFi Juli, Bayar Listrik"
              />
            </div>

            {/* Jumlah (required) */}
            <div className="flex flex-col gap-1.5">
              <Label>
                Jumlah (Rp) <span className="text-destructive">*</span>
              </Label>
              <Input
                type="number"
                min={1}
                value={total}
                onChange={(e) => setTotal(e.target.value)}
                placeholder="Mis. 350000"
              />
            </div>

            {/* Tanggal */}
            <div className="flex flex-col gap-1.5">
              <Label>Tanggal</Label>
              <Input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
              />
            </div>
          </div>

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
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
