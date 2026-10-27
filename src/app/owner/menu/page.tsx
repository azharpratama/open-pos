"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { ImageIcon, ImagePlus, Loader2, Pencil, Plus, Search, Trash2, X } from "lucide-react";
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
import { PRODUCT_CATEGORIES } from "@/lib/menu";
import { fetchInventory, type InventoryItem } from "@/lib/inventory";
import {
  createMenuItem,
  deleteMenuItem,
  fetchMenuItem,
  fetchMenuItems,
  updateMenuItem,
  uploadMenuPhoto,
  type MenuItem,
} from "@/lib/menu-admin";

type RecipeRow = { ingredientId: string; quantity: string };

const SELECT_CLASS =
  "h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50";

export default function MenuPage() {
  const { data: items = [], error: itemsError, isLoading: itemsLoading, mutate: mutateItems } = useSWR("/api/menu/admin", fetchMenuItems);
  const { data: inventory = [], error: invError, isLoading: invLoading } = useSWR("/api/inventory", fetchInventory);

  const loading = itemsLoading || invLoading;
  const errorObj = itemsError || invError;
  const error = errorObj instanceof Error ? errorObj.message : errorObj ? "Gagal memuat" : null;

  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>(PRODUCT_CATEGORIES[0]);
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [recipe, setRecipe] = useState<RecipeRow[]>([]);

  const [deleteTarget, setDeleteTarget] = useState<MenuItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  function openCreate() {
    setEditing(null);
    setName("");
    setCategory(PRODUCT_CATEGORIES[0]);
    setPrice("");
    setImageUrl(null);
    setRecipe([]);
    setFormLoading(false);
    setFormOpen(true);
  }

  async function handlePhotoPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset the input so picking the same file again still fires onChange.
    e.target.value = "";
    if (!file) return;
    setPhotoUploading(true);
    try {
      const url = await uploadMenuPhoto(file);
      setImageUrl(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengunggah foto");
    } finally {
      setPhotoUploading(false);
    }
  }

  async function openEdit(item: MenuItem) {
    setEditing(item);
    setFormOpen(true);
    setFormLoading(true);
    try {
      const detail = await fetchMenuItem(item.id);
      setName(detail.name);
      setCategory(
        (PRODUCT_CATEGORIES as string[]).includes(detail.category)
          ? detail.category
          : PRODUCT_CATEGORIES[0],
      );
      setPrice(detail.price === null ? "" : String(detail.price));
      setImageUrl(detail.imageUrl);
      setRecipe(
        detail.ingredients.map((g) => ({
          ingredientId: g.ingredientId,
          quantity: String(g.quantity),
        })),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memuat detail");
      setFormOpen(false);
    } finally {
      setFormLoading(false);
    }
  }

  function setRow(i: number, patch: Partial<RecipeRow>) {
    setRecipe((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function addRow() {
    setRecipe((prev) => [...prev, { ingredientId: "", quantity: "" }]);
  }
  function removeRow(i: number) {
    setRecipe((prev) => prev.filter((_, idx) => idx !== i));
  }

  const canSave = Boolean(name.trim() && category);

  async function handleSave() {
    if (!canSave || saving) return;
    const input = {
      name: name.trim(),
      category,
      price: price === "" ? null : Number(price),
      imageUrl,
      ingredients: recipe
        .filter((r) => r.ingredientId && Number(r.quantity) > 0)
        .map((r) => ({ ingredientId: r.ingredientId, quantity: Number(r.quantity) })),
    };
    setSaving(true);
    try {
      if (editing) {
        const updated = await updateMenuItem(editing.id, input);
        mutateItems(
          (prev) =>
            prev
              ?.map((i) => (i.id === updated.id ? updated : i))
              .sort((a, b) => a.name.localeCompare(b.name)),
          false
        );
        toast.success("Menu diperbarui");
      } else {
        const created = await createMenuItem(input);
        mutateItems(
          (prev) =>
            [...(prev ?? []), created].sort((a, b) => a.name.localeCompare(b.name)),
          false
        );
        toast.success("Menu ditambahkan");
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
      await deleteMenuItem(deleteTarget.id);
      mutateItems((prev) => prev?.filter((i) => i.id !== deleteTarget.id), false);
      toast.success("Menu dihapus");
      setDeleteTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus");
    } finally {
      setDeleting(false);
    }
  }

  const filteredItems = items.filter((item) =>
    search.trim()
      ? item.name.toLowerCase().includes(search.trim().toLowerCase()) ||
        item.category.toLowerCase().includes(search.trim().toLowerCase())
      : true,
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {filteredItems.length} menu jual
        </p>
        <div className="flex items-center gap-2.5 ml-auto">
          <div className="relative w-48 sm:w-56">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari menu..."
              className="h-10 pl-9 text-xs"
            />
          </div>
          <Button
            type="button"
            className="h-9 px-3.5 text-xs sm:text-sm font-medium"
            onClick={openCreate}
          >
            <Plus className="size-4" />
            Tambah Menu
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Memuat...
          </div>
        ) : error ? (
          <p className="py-16 text-center text-sm text-destructive">{error}</p>
        ) : filteredItems.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            {search ? "Menu tidak ditemukan." : "Belum ada menu. Tambahkan di atas."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Foto</th>
                  <th className="px-4 py-3 font-medium">Nama</th>
                  <th className="px-4 py-3 font-medium">Kategori</th>
                  <th className="px-4 py-3 font-medium">Harga</th>
                  <th className="px-4 py-3 font-medium">Bahan</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="size-10 overflow-hidden rounded-md border bg-muted">
                        {item.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="size-full object-cover"
                          />
                        ) : (
                          <div className="flex size-full items-center justify-center text-muted-foreground">
                            <ImageIcon className="size-4" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium">{item.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {item.category}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {item.price === null ? "-" : formatRupiah(item.price)}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">
                      {item.ingredientCount} bahan
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEdit(item)}
                          aria-label={`Edit ${item.name}`}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive"
                          onClick={() => setDeleteTarget(item)}
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

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Menu" : "Tambah Menu"}</DialogTitle>
          </DialogHeader>

          {formLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Memuat detail...
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <Field label="Foto Menu">
                <div className="flex items-center gap-3">
                  <div className="relative size-20 shrink-0 overflow-hidden rounded-lg border bg-muted">
                    {imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imageUrl}
                        alt={name || "Foto menu"}
                        className="size-full object-cover"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center text-muted-foreground">
                        <ImageIcon className="size-6" />
                      </div>
                    )}
                    {photoUploading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                        <Loader2 className="size-5 animate-spin" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handlePhotoPick}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={photoUploading}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <ImagePlus className="size-4" />
                      {imageUrl ? "Ganti foto" : "Unggah foto"}
                    </Button>
                    {imageUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        disabled={photoUploading}
                        onClick={() => setImageUrl(null)}
                      >
                        <X className="size-4" />
                        Hapus foto
                      </Button>
                    )}
                    <p className="text-xs text-muted-foreground">
                      JPG, PNG, atau WebP. Maks 5 MB.
                    </p>
                  </div>
                </div>
              </Field>
              <Field label="Nama Menu">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Mis. Kopi Susu Aren"
                  autoFocus
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Kategori">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className={SELECT_CLASS}
                  >
                    {PRODUCT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Harga Jual">
                  <Input
                    type="number"
                    min={0}
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0"
                  />
                </Field>
              </div>

              <div className="flex flex-col gap-2">
                <Label>Resep / Bahan (dari inventory)</Label>
                {recipe.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Belum ada bahan. Tanpa resep, stok menu ini yang dikurangi
                    saat terjual.
                  </p>
                )}
                {recipe.map((row, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <select
                      value={row.ingredientId}
                      onChange={(e) => setRow(i, { ingredientId: e.target.value })}
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
                      value={row.quantity}
                      onChange={(e) => setRow(i, { quantity: e.target.value })}
                      placeholder="Qty"
                      className="h-10 w-20"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="shrink-0 text-muted-foreground"
                      onClick={() => removeRow(i)}
                      aria-label="Hapus bahan"
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
                  Tambah bahan
                </Button>
              </div>
            </div>
          )}

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
              disabled={!canSave || saving || formLoading || photoUploading}
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
        title="Hapus menu?"
        description={`"${deleteTarget?.name}" akan dihapus dari daftar menu.`}
        busy={deleting}
        onConfirm={handleDelete}
      />
    </div>
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
