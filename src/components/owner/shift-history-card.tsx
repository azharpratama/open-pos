"use client";

import { Clock, Loader2 } from "lucide-react";
import useSWR from "swr";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatDateShort, formatRupiah } from "@/lib/format";
import { fetchShiftRecap } from "@/lib/shifts";

const RunningBadge = () => (
  <Badge variant="success" className="text-[10px] leading-none">
    Berjalan
  </Badge>
);

// A single shift window row: window hours + the rostered cashier(s) on the left,
// its combined revenue on the right.
function ShiftRow({
  label,
  revenue,
  running,
  names,
}: {
  label: string;
  revenue: number;
  running: boolean;
  names: string[];
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="shrink-0 text-muted-foreground tabular-nums">
          {label}
        </span>
        {running ? <RunningBadge /> : null}
        {names.length > 0 ? (
          <span className="truncate font-medium">{names.join(", ")}</span>
        ) : (
          <span className="text-muted-foreground/60">—</span>
        )}
      </div>
      <span className="shrink-0 font-medium tabular-nums">
        {formatRupiah(revenue)}
      </span>
    </div>
  );
}

// Read-only recap of shift revenue (WIB), grouped by day. Each day shows the
// siang (09:00–17:00) and malam (17:00–02:00) totals and their combined total.
export function ShiftHistoryCard() {
  const { data: days = [], error: swrError, isLoading } = useSWR("/api/shifts/recap", fetchShiftRecap);
  const loading = isLoading;
  const error = swrError instanceof Error ? swrError.message : swrError ? "Gagal memuat riwayat shift" : null;

  return (
    <Card className="gap-4 p-5">
      <div className="flex items-center gap-2">
        <div className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Clock className="size-4.5" />
        </div>
        <div>
          <p className="font-semibold leading-tight">Riwayat Shift</p>
          <p className="text-xs text-muted-foreground">
            Rekap pendapatan per shift (WIB)
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Memuat...
        </div>
      ) : error ? (
        <p className="py-6 text-center text-sm text-destructive">{error}</p>
      ) : days.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Belum ada shift tercatat.
        </p>
      ) : (
        <div className="flex max-h-96 flex-col gap-2 overflow-y-auto">
          {days.map((day) => (
            <div
              key={day.operationalDate}
              className="rounded-lg border px-3 py-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold tabular-nums">
                  {formatDateShort(day.operationalDate)}
                </span>
                <span className="text-sm font-semibold tabular-nums">
                  {formatRupiah(day.total)}
                </span>
              </div>
              <div className="mt-1.5 flex flex-col gap-1">
                {day.luar > 0 ? (
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="min-w-0 truncate font-medium text-warning">
                      Pendapatan diluar jam operasional
                    </span>
                    <span className="shrink-0 font-medium tabular-nums">
                      {formatRupiah(day.luar)}
                    </span>
                  </div>
                ) : null}
                <ShiftRow
                  label="09:00 – 17:00"
                  revenue={day.siang}
                  running={day.siangRunning}
                  names={day.siangNames}
                />
                <ShiftRow
                  label="17:00 – 02:00"
                  revenue={day.malam}
                  running={day.malamRunning}
                  names={day.malamNames}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
