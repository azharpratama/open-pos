"use client";

import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { removeBonus, setBonus, type Bonus } from "@/lib/bonuses";
import type { Employee } from "@/lib/employees";
import type { InventoryItem } from "@/lib/inventory";

const SELECT_CLASS =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function EmployeeBonusDialog({
  employee,
  bonuses,
  pcsItems,
  onOpenChange,
  onChanged,
}: {
  employee: Employee | null;
  bonuses: Bonus[];
  pcsItems: InventoryItem[];
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}) {
  const [productId, setProductId] = useState("");
  const [allocated, setAllocated] = useState("");
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function handleAdd() {
    if (!employee || !productId || allocated === "" || saving) return;
    setSaving(true);
    try {
      await setBonus(employee.id, productId, Number(allocated));
      toast.success("Jatah bonus disimpan");
      setProductId("");
      setAllocated("");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan bonus");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(id: string) {
    setRemovingId(id);
    try {
      await removeBonus(id);
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus bonus");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <Dialog open={employee !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bonus · {employee?.name}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {bonuses.length === 0 ? (
            <p className="rounded-lg bg-muted/50 px-3 py-3 text-sm text-muted-foreground">
              Belum ada jatah bonus. Tambahkan di bawah.
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {bonuses.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
                >
                  <span>
                    {b.productName}{" "}
                    <span className="text-muted-foreground">
                      · sisa {b.remaining}/{b.allocated} {b.unitType}
                    </span>
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive"
                    disabled={removingId === b.id}
                    onClick={() => handleRemove(b.id)}
                    aria-label={`Hapus bonus ${b.productName}`}
                  >
                    {removingId === b.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-lg border border-dashed p-3">
            <Label>Tambah / atur jatah (bahan pcs)</Label>
            <div className="mt-2 flex items-end gap-2">
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className={`${SELECT_CLASS} flex-1`}
              >
                <option value="" disabled>
                  {pcsItems.length === 0 ? "Belum ada bahan pcs" : "Pilih makanan"}
                </option>
                {pcsItems.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name} (stok {i.stockQty})
                  </option>
                ))}
              </select>
              <Input
                type="number"
                min={0}
                value={allocated}
                onChange={(e) => setAllocated(e.target.value)}
                placeholder="Jatah"
                className="h-9 w-20"
              />
              <Button
                type="button"
                className="h-9 shrink-0 px-3.5 text-xs sm:text-sm font-medium"
                disabled={!productId || allocated === "" || saving}
                onClick={handleAdd}
              >
                {saving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
              </Button>
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Hanya bahan satuan (pcs). Menyimpan item yang sama akan mereset sisa
              jatahnya ke jumlah baru.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
