import type { ReactNode } from "react";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatRupiah } from "@/lib/format";

type ManualPaymentPanelProps = {
  total: number;
  icon: ReactNode;
  hint: string;
  loading?: boolean;
  disabled?: boolean;
  onConfirm: () => void;
};

// Pencatatan manual: pelanggan membayar di luar aplikasi (scan QRIS statis warung
// atau transfer ke rekening), lalu kasir mengonfirmasi bahwa dana sudah masuk.
// Tidak ada QR code / gateway yang di-generate — aplikasi murni mencatat.
export function ManualPaymentPanel({
  total,
  icon,
  hint,
}: {
  total: number;
  icon: ReactNode;
  hint: string;
}) {
  return (
    <div className="flex h-[152px] flex-col items-center justify-center gap-2 py-1">
      <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground shrink-0">
        {icon}
      </div>

      <div className="text-center">
        <p className="text-[11px] text-muted-foreground leading-none">Nominal yang harus dibayar</p>
        <p className="mt-1 text-xl font-bold tabular-nums">{formatRupiah(total)}</p>
      </div>

      <p className="max-w-xs text-center text-[11px] leading-snug text-muted-foreground">{hint}</p>
    </div>
  );
}
