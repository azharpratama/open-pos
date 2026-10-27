"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Gift, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
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
  createEmployee,
  deleteEmployee,
  fetchEmployees,
  updateEmployee,
  type Employee,
} from "@/lib/employees";
import { fetchBonuses, type Bonus } from "@/lib/bonuses";
import { fetchInventory, unitKind, type InventoryItem } from "@/lib/inventory";
import { EmployeeBonusDialog } from "@/components/owner/employee-bonus-dialog";

export default function KaryawanPage() {
  const { data: items = [], error: empError, isLoading: empLoading, mutate: mutateItems } = useSWR("/api/employees", fetchEmployees);
  const { data: bonuses = [], error: bonusError, isLoading: bonusLoading, mutate: mutateBonuses } = useSWR("/api/bonuses", fetchBonuses);
  const { data: inventory = [], error: invError, isLoading: invLoading } = useSWR("/api/inventory", fetchInventory);

  const loading = empLoading || bonusLoading || invLoading;
  const errorObj = empError || bonusError || invError;
  const error = errorObj instanceof Error ? errorObj.message : errorObj ? "Gagal memuat karyawan" : null;

  const pcsItems = inventory.filter((i) => unitKind(i.unitType) === "Satuan");

  const [search, setSearch] = useState("");

  const [bonusEmployee, setBonusEmployee] = useState<Employee | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [bankAccountNo, setBankAccountNo] = useState("");
  const [bankName, setBankName] = useState("");
  const [phone, setPhone] = useState("");
  const [shiftCount, setShiftCount] = useState("");
  const [dailyWage, setDailyWage] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function reloadBonuses() {
    mutateBonuses();
  }

  function openCreate() {
    setEditing(null);
    setName("");
    setBankAccountNo("");
    setBankName("");
    setPhone("");
    setShiftCount("");
    setDailyWage("");
    setFormOpen(true);
  }

  function openEdit(item: Employee) {
    setEditing(item);
    setName(item.name);
    setBankAccountNo(item.bankAccountNo ?? "");
    setBankName(item.bankName ?? "");
    setPhone(item.phone ?? "");
    setShiftCount(String(item.shiftCount));
    setDailyWage(String(item.dailyWage));
    setFormOpen(true);
  }

  const canSave = Boolean(name.trim());

  async function handleSave() {
    if (!canSave || saving) return;
    const input = {
      name: name.trim(),
      bankAccountNo: bankAccountNo.trim() || null,
      bankName: bankName.trim() || null,
      phone: phone.trim() || null,
      shiftCount: shiftCount === "" ? 0 : Number(shiftCount),
      dailyWage: dailyWage === "" ? 0 : Number(dailyWage),
    };
    setSaving(true);
    try {
      if (editing) {
        const updated = await updateEmployee(editing.id, input);
        mutateItems(
          (prev) =>
            prev
              ?.map((i) => (i.id === updated.id ? updated : i))
              .sort((a, b) => a.name.localeCompare(b.name)),
          false
        );
        toast.success("Karyawan diperbarui");
      } else {
        const created = await createEmployee(input);
        mutateItems(
          (prev) =>
            [...(prev ?? []), created].sort((a, b) => a.name.localeCompare(b.name)),
          false
        );
        toast.success("Karyawan ditambahkan");
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
      await deleteEmployee(deleteTarget.id);
      mutateItems((prev) => prev?.filter((i) => i.id !== deleteTarget.id), false);
      toast.success("Karyawan dihapus");
      setDeleteTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus");
    } finally {
      setDeleting(false);
    }
  }

  const bonusesByEmployee = new Map<string, Bonus[]>();
  for (const b of bonuses) {
    const list = bonusesByEmployee.get(b.employeeId) ?? [];
    list.push(b);
    bonusesByEmployee.set(b.employeeId, list);
  }

  const filteredItems = items.filter((emp) =>
    search.trim()
      ? emp.name.toLowerCase().includes(search.trim().toLowerCase()) ||
        (emp.bankName && emp.bankName.toLowerCase().includes(search.trim().toLowerCase()))
      : true,
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{filteredItems.length} karyawan</p>
        <div className="flex items-center gap-2.5 ml-auto">
          <div className="relative w-48 sm:w-56">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari karyawan..."
              className="h-10 pl-9 text-xs"
            />
          </div>
          <Button
            type="button"
            className="h-9 px-3.5 text-xs sm:text-sm font-medium"
            onClick={openCreate}
          >
            <Plus className="size-4" />
            Tambah Karyawan
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
            {search ? "Karyawan tidak ditemukan." : "Belum ada karyawan. Tambahkan di atas."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Nama</th>
                  <th className="px-4 py-3 font-medium">No. Rekening</th>
                  <th className="px-4 py-3 font-medium">Bank</th>
                  <th className="px-4 py-3 font-medium">No. Telp</th>
                  <th className="px-4 py-3 font-medium">Shift</th>
                  <th className="px-4 py-3 font-medium">Gaji/Hari</th>
                  <th className="px-4 py-3 font-medium">Bonus</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{item.name}</td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">
                      {item.bankAccountNo ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {item.bankName ?? "-"}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">
                      {item.phone ?? "-"}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{item.shiftCount}</td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatRupiah(item.dailyWage)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1">
                        {(bonusesByEmployee.get(item.id) ?? []).map((b) => (
                          <span
                            key={b.id}
                            className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums"
                          >
                            {b.productName} {b.remaining}/{b.allocated}
                          </span>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          className="h-8 gap-1.5 px-2.5 text-xs font-medium"
                          onClick={() => setBonusEmployee(item)}
                        >
                          <Gift className="size-3.5" />
                          Atur
                        </Button>
                      </div>
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Karyawan" : "Tambah Karyawan"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Field label="Nama Karyawan">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Mis. Tito"
                autoFocus
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="No. Rekening">
                <Input
                  value={bankAccountNo}
                  onChange={(e) => setBankAccountNo(e.target.value)}
                  placeholder="1234567890"
                />
              </Field>
              <Field label="Nama Bank">
                <Input
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="BCA / BRI / ..."
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="No. Telp">
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0812..."
                />
              </Field>
              <Field label="Jumlah Shift">
                <Input
                  type="number"
                  min={0}
                  value={shiftCount}
                  onChange={(e) => setShiftCount(e.target.value)}
                  placeholder="0"
                />
              </Field>
            </div>
            <Field label="Gaji / Hari (Rp)">
              <Input
                type="number"
                min={0}
                value={dailyWage}
                onChange={(e) => setDailyWage(e.target.value)}
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
        title="Hapus karyawan?"
        description={`"${deleteTarget?.name}" akan dihapus dari daftar karyawan.`}
        busy={deleting}
        onConfirm={handleDelete}
      />

      <EmployeeBonusDialog
        employee={bonusEmployee}
        bonuses={
          bonusEmployee ? (bonusesByEmployee.get(bonusEmployee.id) ?? []) : []
        }
        pcsItems={pcsItems}
        onOpenChange={(o) => {
          if (!o) setBonusEmployee(null);
        }}
        onChanged={reloadBonuses}
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
