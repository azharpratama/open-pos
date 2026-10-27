"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
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
import { ConfirmDialog } from "@/components/owner/confirm-dialog";
import { formatRupiah } from "@/lib/format";
import {
  createInventory,
  deleteInventory,
  fetchInventory,
  SATUAN_UNITS,
  TERUKUR_UNITS,
  unitKind,
  updateInventory,
  type InventoryItem,
} from "@/lib/inventory";

const SELECT_CLASS =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export default function InventoryPage() {
  const { data: items = [], error: swrError, isLoading, mutate } = useSWR("/api/inventory", fetchInventory);
  
  const loading = isLoading;
  const error = swrError instanceof Error ? swrError.message : swrError ? "Gagal memuat inventory" : null;

  const [search, setSearch] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [unitType, setUnitType] = useState("");
  const [stockQty, setStockQty] = useState("");
  const [price, setPrice] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  function openCreate() {
    setEditing(null);
    setName("");
    setUnitType("");
    setStockQty("");
    setPrice("");
    setFormOpen(true);
  }

  function openEdit(item: InventoryItem) {
    setEditing(item);
    setName(item.name);
    setUnitType(item.unitType.trim().toLowerCase());
    setStockQty(String(item.stockQty));
    setPrice(item.price === null ? "" : String(item.price));
    setFormOpen(true);
  }

  const canSave = Boolean(
    name.trim() && unitType.trim() && stockQty !== "" && Number(stockQty) >= 0,
  );

  async function handleSave() {
    if (!canSave || saving) return;
    const input = {
      name: name.trim(),
      unitType: unitType.trim(),
      stockQty: Number(stockQty),
      price: price === "" ? null : Number(price),
    };
    setSaving(true);
    try {
      if (editing) {
        const updated = await updateInventory(editing.id, input);
        mutate(
          (prev) =>
            prev
              ?.map((i) => (i.id === updated.id ? updated : i))
              .sort((a, b) => a.name.localeCompare(b.name)),
          false
        );
        toast.success("Bahan diperbarui");
      } else {
        const created = await createInventory(input);
        mutate(
          (prev) =>
            [...(prev ?? []), created].sort((a, b) => a.name.localeCompare(b.name)),
          false
        );
        toast.success("Bahan ditambahkan");
      }
      setFormOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteInventory(deleteTarget.id);
      mutate((prev) => prev?.filter((i) => i.id !== deleteTarget.id), false);
      toast.success("Bahan dihapus");
      setDeleteTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus");
    } finally {
      setDeleting(false);
    }
  }

  const filtered = items.filter((i) =>
    search.trim() ? i.name.toLowerCase().includes(search.trim().toLowerCase()) : true,
  );
  const satuanItems = filtered.filter((i) => unitKind(i.unitType) === "Satuan");
  const terukurItems = filtered.filter((i) => unitKind(i.unitType) === "Terukur");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{filtered.length} bahan baku</p>
        <div className="flex items-center gap-2.5 ml-auto">
          <div className="relative w-48 sm:w-56">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari bahan baku..."
              className="h-10 pl-9 text-xs"
            />
          </div>
          <Button
            type="button"
            className="h-9 px-3.5 text-xs sm:text-sm font-medium"
            onClick={openCreate}
          >
            <Plus className="size-4" />
            Tambah Bahan
          </Button>
        </div>
      </div>

      {loading ? (
        <Card className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Memuat...
        </Card>
      ) : error ? (
        <Card className="py-16 text-center text-sm text-destructive">{error}</Card>
      ) : (
        <>
          <InventoryTable
            title="Bahan Satuan (pcs)"
            items={satuanItems}
            onEdit={openEdit}
            onDelete={setDeleteTarget}
          />
          <InventoryTable
            title="Bahan Terukur (kg / liter / kwh / kantong)"
            items={terukurItems}
            onEdit={openEdit}
            onDelete={setDeleteTarget}
          />
        </>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Bahan" : "Tambah Bahan"}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Field label="Nama Bahan">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Mis. Gula pasir"
                autoFocus
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Satuan">
                <select
                  value={unitType}
                  onChange={(e) => setUnitType(e.target.value)}
                  className={SELECT_CLASS}
                >
                  <option value="" disabled>
                    Pilih satuan
                  </option>
                  <optgroup label="Satuan (hitungan)">
                    {SATUAN_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Terukur">
                    {TERUKUR_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </Field>
              <Field label="Stok">
                <Input
                  type="number"
                  min={0}
                  value={stockQty}
                  onChange={(e) => setStockQty(e.target.value)}
                  placeholder="0"
                />
              </Field>
            </div>
            <Field label="Harga / satuan (opsional)">
              <Input
                type="number"
                min={0}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
              />
            </Field>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="h-9 px-4 text-xs sm:text-sm font-medium"
              disabled={saving}
              onClick={() => setFormOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="button"
              className="h-9 px-4 text-xs sm:text-sm font-semibold"
              disabled={!canSave || saving}
              onClick={handleSave}
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
        title="Hapus bahan?"
        description={`"${deleteTarget?.name}" akan dihapus dari inventory.`}
        busy={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}

function InventoryTable({
  title,
  items,
  onEdit,
  onDelete,
}: {
  title: string;
  items: InventoryItem[];
  onEdit: (item: InventoryItem) => void;
  onDelete: (item: InventoryItem) => void;
}) {
  return (
    <Card className="gap-0 overflow-hidden p-0">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <p className="font-semibold">{title}</p>
        <span className="text-xs text-muted-foreground">{items.length} bahan</span>
      </div>
      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Belum ada bahan di kelompok ini.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Nama</th>
                <th className="px-4 py-3 font-medium">Stok</th>
                <th className="px-4 py-3 font-medium">Satuan</th>
                <th className="px-4 py-3 font-medium">Harga</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{item.name}</td>
                  <td className="px-4 py-3 tabular-nums">{item.stockQty}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {item.unitType}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {item.price === null ? "-" : formatRupiah(item.price)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onEdit(item)}
                        aria-label={`Edit ${item.name}`}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive"
                        onClick={() => onDelete(item)}
                        aria-label={`Hapus ${item.name}`}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
