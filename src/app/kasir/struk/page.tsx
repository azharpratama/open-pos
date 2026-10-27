"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import { ReceiptView } from "@/components/kasir/receipt-view";
import { cn } from "@/lib/utils";
import {
  MOCK_RECEIPT,
  getReceiptServerSnapshot,
  getReceiptSnapshot,
  subscribeReceipt,
} from "@/lib/receipt";
import { printBytes } from "@/lib/printer";
import { buildEscPosReceipt } from "@/lib/escpos";

export default function StrukPage() {
  const stored = useSyncExternalStore(
    subscribeReceipt,
    getReceiptSnapshot,
    getReceiptServerSnapshot,
  );
  const receipt = stored ?? MOCK_RECEIPT;
  const [printing, setPrinting] = useState(false);

  async function handlePrint() {
    // Cegah tekan-ganda: kiriman yang menumpuk bisa nyangkut di buffer printer
    // dan tercetak berulang sendiri saat reconnect.
    if (printing) return;
    setPrinting(true);
    // Printer thermal hanya dijangkau lewat Bluetooth (ESC/POS).
    // window.print() TIDAK bisa mencetak ke sana, jadi jangan dipakai sebagai
    // fallback — printBytes sudah menangani reconnect & memberi pesan jelas
    // bila printer belum tersambung.
    try {
      const bytes = buildEscPosReceipt(receipt);
      await printBytes(bytes);
      toast.success("Struk sedang dicetak...");
    } catch (err: any) {
      toast.error(
        err?.message ||
          "Gagal mencetak. Hubungkan printer lewat tombol Bluetooth di navbar.",
      );
    } finally {
      setPrinting(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-muted/30 px-4 py-2">
      <div className="no-print flex w-full max-w-[320px] items-center justify-between">
        <Link
          href="/kasir/antrian"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          <ArrowLeft className="size-4" />
          Antrian
        </Link>
        {!stored && (
          <span className="text-xs text-muted-foreground">Contoh struk</span>
        )}
      </div>

      <ReceiptView receipt={receipt} />

      <div className="no-print flex w-full max-w-[320px] gap-2">
        <Button
          className="h-12 flex-1 rounded-xl text-sm font-semibold"
          onClick={handlePrint}
          disabled={printing}
        >
          <Printer className="size-4 mr-1.5 shrink-0" />
          {printing ? "Mencetak..." : "Cetak"}
        </Button>
        <Link
          href="/kasir/pesan"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-12 flex-1 rounded-xl text-sm font-semibold text-center whitespace-nowrap",
          )}
        >
          Baru
        </Link>
      </div>
    </div>
  );
}
