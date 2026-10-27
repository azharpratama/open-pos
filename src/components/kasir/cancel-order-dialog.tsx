"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
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
import { createCancellation } from "@/lib/cancellations";
import type { Order } from "@/lib/orders";

type CancelOrderDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  onSuccess: () => void;
};

export function CancelOrderDialog({
  open,
  onOpenChange,
  order,
  onSuccess,
}: CancelOrderDialogProps) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!order) return;
    
    setSubmitting(true);
    try {
      await createCancellation({
        orderId: order.dbId!,
        requestedBy: order.cashier || "Kasir",
        reason: reason.trim() || undefined,
      });
      toast.success("Permintaan pembatalan berhasil diajukan");
      setReason("");
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengajukan pembatalan");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Batalkan Pesanan</DialogTitle>
          <DialogDescription>
            Pesanan #{order?.id} ({order?.customerName})
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="reason">Alasan Pembatalan (Opsional)</Label>
            <Input
              id="reason"
              placeholder="Mis: Pelanggan salah pesan..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <div className="rounded-lg bg-danger-subtle p-3 text-xs text-destructive border border-danger-border">
            <p>
              <strong>Perhatian:</strong> Permintaan ini akan dikirim ke Owner untuk disetujui. 
              Refund uang dan pengembalian stok hanya akan diproses setelah Owner menyetujui.
            </p>
          </div>
          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Kembali
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={submitting}
            >
              {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              Ajukan Pembatalan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
