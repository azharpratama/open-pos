"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  BookText,
  Check,
  ClipboardList,
  Loader2,
  Package,
  Receipt,
  ShieldCheck,
  ShoppingCart,
  Trash2,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";

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
import { cn } from "@/lib/utils";
import {
  DATASETS,
  DATASET_BY_KEY,
  DATASET_KEYS,
  TABLE_LABELS,
  withRequired,
  type DatasetKey,
} from "@/lib/clear-datasets";

const ICONS: Record<DatasetKey, LucideIcon> = {
  sales: Receipt,
  sales_log: ClipboardList,
  bookkeeping: BookText,
  employees: Users,
  menu: UtensilsCrossed,
  inventory: Package,
  procurement: ShoppingCart,
};

export default function ClearDatasetPage() {
  // `raw` = what the owner explicitly ticked. `effective` folds in the FK
  // companions (e.g. Menu drags in Penjualan) — it's what's shown as checked
  // and what gets sent to the server.
  const [raw, setRaw] = useState<Set<DatasetKey>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const effective = useMemo(() => withRequired(raw), [raw]);
  const allSelected = effective.size === DATASET_KEYS.length;

  function toggle(key: DatasetKey) {
    setRaw((prev) => {
      const next = new Set(prev);
      if (withRequired(prev).has(key)) {
        // Unchecking: drop the key AND anything that (transitively) requires it,
        // so we never leave a dependent stranded without its companion.
        next.delete(key);
        for (const k of [...next]) {
          if (k !== key && withRequired([k]).has(key)) next.delete(k);
        }
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function toggleAll() {
    setRaw((prev) =>
      withRequired(prev).size === DATASET_KEYS.length
        ? new Set()
        : new Set(DATASET_KEYS),
    );
  }

  async function handleConfirm() {
    if (busy) return;
    if (effective.size === 0) {
      toast.error("Pilih minimal satu dataset");
      return;
    }
    if (!password) {
      toast.error("Masukkan password owner untuk konfirmasi");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/clear-datasets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targets: [...effective], password }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Gagal menghapus dataset");
        return;
      }
      const counts = (json.data?.counts ?? {}) as Record<string, number>;
      const total = Object.values(counts).reduce((a, b) => a + Number(b), 0);
      const detail = Object.entries(counts)
        .filter(([, v]) => Number(v) > 0)
        .map(([k, v]) => `${TABLE_LABELS[k] ?? k}: ${v}`)
        .join(" · ");
      toast.success(`Berhasil menghapus ${total} baris data`, {
        description: detail || "Tidak ada baris yang perlu dihapus.",
      });
      setRaw(new Set());
      setPassword("");
      setDialogOpen(false);
    } catch {
      toast.error("Tidak dapat terhubung ke server. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  const selectedList = [...effective].map((k) => DATASET_BY_KEY[k].label);

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <Link
        href="/owner/settings"
        className="flex items-center gap-1.5 self-start text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Kembali ke Pengaturan
      </Link>

      {/* Danger notice */}
      <div className="flex gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
        <AlertTriangle className="size-5 shrink-0 text-destructive" />
        <div className="flex flex-col gap-1">
          <p className="font-medium text-destructive">
            Penghapusan permanen &amp; tidak bisa dibatalkan
          </p>
          <p className="text-muted-foreground">
            Pilih dataset yang ingin dikosongkan, lalu konfirmasi dengan password
            owner. Akun login (owner &amp; kasir) tidak akan pernah ikut dihapus,
            jadi Anda tetap bisa masuk setelah reset. Cocok untuk membersihkan
            data uji coba sebelum dipakai produksi.
          </p>
        </div>
      </div>

      {/* Select all */}
      <button
        type="button"
        onClick={toggleAll}
        className={cn(
          "flex items-center justify-between rounded-xl border p-4 text-left transition-colors",
          allSelected
            ? "border-destructive/50 bg-destructive/10"
            : "border-border hover:bg-muted/50",
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg",
              allSelected
                ? "bg-destructive text-white"
                : "bg-muted text-muted-foreground",
            )}
          >
            <Trash2 className="size-4.5" />
          </div>
          <div>
            <p className="font-medium">Hapus Semua Dataset</p>
            <p className="text-sm text-muted-foreground">
              Reset total kecuali akun login (users)
            </p>
          </div>
        </div>
        <CheckBox checked={allSelected} tone="danger" />
      </button>

      {/* Per-dataset toggles */}
      <div className="flex flex-col gap-2">
        {DATASETS.map((d) => {
          const Icon = ICONS[d.key];
          const checked = effective.has(d.key);
          const autoOnly = checked && !raw.has(d.key);
          const pulls = d.requires
            .map((r) => DATASET_BY_KEY[r].label)
            .join(", ");
          return (
            <button
              key={d.key}
              type="button"
              onClick={() => toggle(d.key)}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-4 text-left transition-colors",
                checked
                  ? "border-foreground/20 bg-muted/50"
                  : "border-border hover:bg-muted/40",
              )}
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Icon className="size-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{d.label}</p>
                  {pulls && (
                    <span className="rounded-full bg-warning-subtle border border-warning-border px-2 py-0.5 text-[11px] font-medium text-warning-foreground">
                      termasuk {pulls}
                    </span>
                  )}
                  {autoOnly && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      otomatis dipilih
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">{d.description}</p>
                <p className="mt-1 font-mono text-[11px] text-muted-foreground/70">
                  {d.tables}
                </p>
              </div>
              <CheckBox checked={checked} tone="default" />
            </button>
          );
        })}
      </div>

      {/* Action bar */}
      <div className="sticky bottom-0 -mx-4 flex items-center justify-between gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <p className="text-sm text-muted-foreground">
          {effective.size === 0
            ? "Belum ada dataset dipilih"
            : `${effective.size} dataset dipilih`}
        </p>
        <Button
          variant="destructive"
          disabled={effective.size === 0}
          onClick={() => setDialogOpen(true)}
        >
          <Trash2 className="size-4" />
          Hapus Dataset
        </Button>
      </div>

      {/* Password confirmation */}
      <Dialog open={dialogOpen} onOpenChange={(o) => !busy && setDialogOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="size-4" />
              Konfirmasi Penghapusan
            </DialogTitle>
            <DialogDescription>
              Anda akan menghapus permanen dataset berikut. Masukkan password
              owner untuk melanjutkan.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                Yang akan dihapus
              </p>
              <div className="flex flex-wrap gap-1.5">
                {selectedList.map((label) => (
                  <span
                    key={label}
                    className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleConfirm();
              }}
              className="flex flex-col gap-2"
            >
              <Label htmlFor="clear-password">Password Owner</Label>
              <Input
                id="clear-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password akun owner"
                className="h-10"
                autoFocus
              />
            </form>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={busy}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={busy || !password}
            >
              {busy ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Menghapus...
                </>
              ) : (
                <>
                  <Trash2 className="size-4" />
                  Hapus Sekarang
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CheckBox({
  checked,
  tone,
}: {
  checked: boolean;
  tone: "default" | "danger";
}) {
  return (
    <div
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors",
        checked
          ? tone === "danger"
            ? "border-destructive bg-destructive text-white"
            : "border-foreground bg-foreground text-background"
          : "border-input",
      )}
    >
      {checked && <Check className="size-3.5" strokeWidth={3} />}
    </div>
  );
}
