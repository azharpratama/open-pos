"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
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
import {
  createSupplier,
  deleteSupplier,
  fetchSuppliers,
  updateSupplier,
  type Supplier,
} from "@/lib/suppliers";

export function SupplierManager() {
  const { data: items = [], error: swrError, isLoading, mutate } = useSWR("/api/suppliers", fetchSuppliers);
  const loading = isLoading;
  const error = swrError instanceof Error ? swrError.message : swrError ? "Gagal memuat supplier" : null;

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);
  const [deleting, setDeleting] = useState(false);

  function openCreate() {
    setEditing(null);
    setName("");
    setContact("");
    setLocation("");
    setNotes("");
    setFormOpen(true);
  }

  function openEdit(item: Supplier) {
    setEditing(item);
    setName(item.name);
    setContact(item.contact ?? "");
    setLocation(item.location ?? "");
    setNotes(item.notes ?? "");
    setFormOpen(true);
  }

  const canSave = Boolean(name.trim());

  async function handleSave() {
    if (!canSave || saving) return;
    const input = {
      name: name.trim(),
      contact: contact.trim() || null,
      location: location.trim() || null,
      notes: notes.trim() || null,
    };
    setSaving(true);
    try {
      if (editing) {
        const updated = await updateSupplier(editing.id, input);
        mutate(
          (prev) =>
            prev
              ?.map((i) => (i.id === updated.id ? updated : i))
              .sort((a, b) => a.name.localeCompare(b.name)),
          false
        );
        toast.success("Supplier diperbarui");
      } else {
        const created = await createSupplier(input);
        mutate(
          (prev) =>
            [...(prev ?? []), created].sort((a, b) => a.name.localeCompare(b.name)),
          false
        );
        toast.success("Supplier ditambahkan");
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
      await deleteSupplier(deleteTarget.id);
      mutate((prev) => prev?.filter((i) => i.id !== deleteTarget.id), false);
      toast.success("Supplier dihapus");
      setDeleteTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Card className="gap-4 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold leading-tight">Supplier</p>
          <p className="text-xs text-muted-foreground">{items.length} pemasok</p>
        </div>
        <Button
          type="button"
          className="h-9 px-3.5 text-xs sm:text-sm font-medium"
          onClick={openCreate}
        >
          <Plus className="size-4" />
          Tambah
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Memuat...
        </div>
      ) : error ? (
        <p className="py-8 text-center text-sm text-destructive">{error}</p>
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Belum ada supplier.
        </p>
      ) : (
        <div className="-mx-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-y bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-2.5 font-medium">Nama</th>
                <th className="px-5 py-2.5 font-medium">Kontak</th>
                <th className="px-5 py-2.5 font-medium">Lokasi</th>
                <th className="px-5 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-muted/30">
                  <td className="px-5 py-2.5 font-medium">{item.name}</td>
                  <td className="px-5 py-2.5 text-muted-foreground">
                    {item.contact ?? "-"}
                  </td>
                  <td className="px-5 py-2.5 text-muted-foreground">
                    {item.location ?? "-"}
                  </td>
                  <td className="px-5 py-2.5">
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

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Supplier" : "Tambah Supplier"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Field label="Nama Supplier" id="supplier-name">
              <Input
                id="supplier-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Mis. Toko Sembako Jaya"
                autoFocus
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Kontak" id="supplier-contact">
                <Input
                  id="supplier-contact"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="0812..."
                />
              </Field>
              <Field label="Lokasi" id="supplier-location">
                <Input
                  id="supplier-location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Pasar / alamat"
                />
              </Field>
            </div>
            <Field label="Catatan (opsional)">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Harga nego, barang yang dijual, dll."
                className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
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
        title="Hapus supplier?"
        description={`"${deleteTarget?.name}" akan dihapus.`}
        busy={deleting}
        onConfirm={handleDelete}
      />
    </Card>
  );
}

function Field({ label, id, children }: { label: string; id?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
