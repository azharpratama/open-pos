"use client";

import { useMemo, useState } from "react";
import { Bell, Gift, Loader2, Minus, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import useSWR from "swr";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Sidebar } from "@/components/layout/sidebar";
import { HeaderBar } from "@/components/layout/header-bar";
import { WibClock } from "@/components/kasir/wib-clock";
import { consumeBonus, fetchBonuses, type Bonus } from "@/lib/bonuses";

export default function BonusPage() {
  const [search, setSearch] = useState("");
  const [takingId, setTakingId] = useState<string | null>(null);

  const { data: bonuses = [], error: swrError, isLoading, mutate } = useSWR("/api/bonuses", fetchBonuses);
  const loading = isLoading;
  const error = swrError instanceof Error ? swrError.message : swrError ? "Gagal memuat bonus" : null;

  function reload() {
    mutate();
    toast.success("Bonus diperbarui");
  }

  async function handleTake(bonus: Bonus) {
    if (takingId) return;
    setTakingId(bonus.id);
    try {
      const res = await consumeBonus(bonus.id, 1);
      mutate((prev) =>
        prev?.map((b) => (b.id === bonus.id ? { ...b, remaining: res.remaining } : b)),
        false
      );
      toast.success(`${bonus.productName} diambil · sisa ${res.remaining}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengambil bonus");
    } finally {
      setTakingId(null);
    }
  }

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const map = new Map<string, { name: string; items: Bonus[] }>();
    for (const b of bonuses) {
      if (q && !b.employeeName.toLowerCase().includes(q)) continue;
      const g = map.get(b.employeeId) ?? { name: b.employeeName, items: [] };
      g.items.push(b);
      map.set(b.employeeId, g);
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [bonuses, search]);

  return (
    <div className="flex h-dvh bg-background">
      <Sidebar active="bonus" />

      <div className="flex flex-1 flex-col overflow-hidden">
        <HeaderBar
          title="Klaim Bonus"
          subtitle="Program Loyalitas & Jatah Bonus Karyawan"
          onRefresh={reload}
        />

        <div className="flex-1 overflow-y-auto p-4">
          <div className="mx-auto flex max-w-4xl flex-col gap-4">
            <div className="relative w-full">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari karyawan..."
                className="h-10 w-full pl-9 text-xs"
              />
            </div>

            {loading ? (
              <Card className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Memuat...
              </Card>
            ) : error ? (
              <Card className="py-16 text-center text-sm text-destructive">
                {error}
              </Card>
            ) : groups.length === 0 ? (
              <Card className="flex flex-col items-center gap-3 py-16 text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                  <Gift className="size-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {bonuses.length === 0
                    ? "Belum ada bonus. Owner belum mengatur jatah karyawan."
                    : `Tidak ada karyawan cocok dengan "${search}".`}
                </p>
              </Card>
            ) : (
              groups.map((group) => (
                <Card key={group.name} className="gap-0 overflow-hidden p-0">
                  <div className="flex items-center gap-2 border-b px-4 py-3">
                    <div className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                      {group.name.charAt(0).toUpperCase()}
                    </div>
                    <p className="font-semibold">{group.name}</p>
                  </div>
                  <div className="divide-y">
                    {group.items.map((b) => {
                      const empty = b.remaining <= 0;
                      const pct =
                        b.allocated > 0
                          ? Math.max(0, Math.round((b.remaining / b.allocated) * 100))
                          : 0;
                      return (
                        <div
                          key={b.id}
                          className="flex items-center gap-3 px-4 py-3"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium">{b.productName}</p>
                            <div className="mt-1.5 flex items-center gap-2">
                              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                                <div
                                  className={
                                    empty
                                      ? "h-full rounded-full bg-destructive"
                                      : "h-full rounded-full bg-primary"
                                  }
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-xs tabular-nums text-muted-foreground">
                                sisa {b.remaining}/{b.allocated} {b.unitType}
                              </span>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            className="h-9 px-3.5 text-xs sm:text-sm font-medium"
                            disabled={empty || takingId === b.id}
                            onClick={() => handleTake(b)}
                          >
                            {takingId === b.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Minus className="size-4" />
                            )}
                            Ambil 1
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
