"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import useSWR from "swr";
import {
  Brush,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatDateLong, formatRupiah } from "@/lib/format";
import {
  fetchTrend,
  type Granularity,
  type TrendMetric,
} from "@/lib/dashboard";

const TABS: { key: Granularity; label: string }[] = [
  { key: "daily", label: "Harian" },
  { key: "weekly", label: "Mingguan" },
  { key: "monthly", label: "Bulanan" },
];

function compactRupiah(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0)}jt`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}rb`;
  return `${n}`;
}

function toDate(bucket: string): Date {
  return new Date(`${bucket}T00:00:00+07:00`);
}

function axisLabel(bucket: string, g: Granularity): string {
  const d = toDate(bucket);
  if (g === "monthly")
    return new Intl.DateTimeFormat("id-ID", {
      month: "short",
      year: "2-digit",
      timeZone: "Asia/Jakarta",
    }).format(d);
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(d);
}

function fullLabel(bucket: string, g: Granularity): string {
  const d = toDate(bucket);
  if (g === "monthly")
    return new Intl.DateTimeFormat("id-ID", {
      month: "long",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    }).format(d);
  if (g === "weekly")
    return `Pekan ${new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      timeZone: "Asia/Jakarta",
    }).format(d)}`;
  return formatDateLong(bucket);
}

type Row = { label: string; full: string; value: number };

function TrendTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: Row }[];
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-lg border bg-card px-3 py-2 text-sm shadow-sm">
      <p className="text-xs text-muted-foreground">{row.full}</p>
      <p className="font-semibold tabular-nums">{formatRupiah(row.value)}</p>
    </div>
  );
}

export function TrendChart({
  title,
  metric,
  color,
  hint,
}: {
  title: string;
  metric: TrendMetric;
  color: string;
  hint: string;
}) {
  const [granularity, setGranularity] = useState<Granularity>("daily");
  
  const { data: points = [], error: swrError, isLoading } = useSWR(
    ["/api/trend", granularity, metric],
    ([, g, m]) => fetchTrend(g, m)
  );

  const loading = isLoading;
  const error = swrError instanceof Error ? swrError.message : swrError ? "Gagal memuat tren" : null;

  async function changeGranularity(g: Granularity) {
    if (g === granularity) return;
    setGranularity(g);
  }

  const rows: Row[] = useMemo(
    () =>
      points.map((p) => ({
        label: axisLabel(p.bucket, granularity),
        full: fullLabel(p.bucket, granularity),
        value: p.value,
      })),
    [points, granularity],
  );

  return (
    <Card className="gap-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-semibold">{title}</p>
        <div className="flex rounded-lg border p-0.5">
          {TABS.map((t) => (
            <Button
              key={t.key}
              type="button"
              variant="ghost"
              className={cn(
                "h-8 px-3 text-xs font-medium",
                granularity === t.key &&
                  "bg-accent text-accent-foreground font-semibold hover:bg-accent",
              )}
              onClick={() => changeGranularity(t.key)}
            >
              {t.label}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Memuat...
        </div>
      ) : error ? (
        <p className="py-16 text-center text-sm text-destructive">{error}</p>
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 20, right: 16, bottom: 4, left: 4 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
                minTickGap={16}
              />
              <YAxis
                width={52}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => compactRupiah(Number(v))}
              />
              <Tooltip
                content={<TrendTooltip />}
                cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                dot={{ r: 3, fill: color, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              >
                <LabelList
                  dataKey="value"
                  position="top"
                  offset={10}
                  fill="var(--card-foreground)"
                  fontSize={10}
                  fontWeight={600}
                  formatter={(value: unknown) => {
                    const n = Number(value);
                    return n > 0 ? compactRupiah(n) : "";
                  }}
                />
              </Line>
              <Brush
                dataKey="label"
                height={22}
                travellerWidth={8}
                stroke={color}
                fill="var(--muted)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">{hint}</p>
    </Card>
  );
}
