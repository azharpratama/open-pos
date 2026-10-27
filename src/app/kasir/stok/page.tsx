"use client";

import { useMemo, useState } from "react";
import { Bell, Loader2, Package, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import useSWR from "swr";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Sidebar } from "@/components/layout/sidebar";
import { HeaderBar } from "@/components/layout/header-bar";
import { WibClock } from "@/components/kasir/wib-clock";
import { cn } from "@/lib/utils";
import {
  fetchInventory,
  unitKind,
  type InventoryItem,
} from "@/lib/inventory";

export default function StokPage() {
  const [search, setSearch] = useState("");

  const { data: items = [], error: swrError, isLoading, mutate } = useSWR("/api/inventory", fetchInventory);
  const loading = isLoading;
  const error = swrError instanceof Error ? swrError.message : swrError ? "Gagal memuat stok" : null;

  function reload() {
    mutate();
    toast.success("Stok diperbarui");
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.name.toLowerCase().includes(q));
  }, [items, search]);

  const satuan = filtered.filter((i) => unitKind(i.unitType) === "Satuan");
  const terukur = filtered.filter((i) => unitKind(i.unitType) === "Terukur");

  return (
    <div className="flex h-dvh bg-background">
      <Sidebar active="stok" />

      <div className="flex flex-1 flex-col overflow-hidden">
        <HeaderBar
          title="Stok & Bahan"
          subtitle="Status Sisa Stok & Availability Bahan Baku"
          onRefresh={reload}
        />

        <div className="flex-1 overflow-y-auto p-4">
          <div className="mx-auto flex max-w-4xl flex-col gap-4">
            <div className="relative w-full">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari bahan..."
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
            ) : filtered.length === 0 ? (
              <Card className="flex flex-col items-center gap-3 py-16 text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                  <Package className="size-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {items.length === 0
                    ? "Belum ada bahan di gudang."
                    : `Tidak ada bahan cocok dengan "${search}".`}
                </p>
              </Card>
            ) : (
              <>
                <StockTable title="Bahan Satuan (pcs)" items={satuan} />
                <StockTable
                  title="Bahan Terukur (kg / liter / kwh / kantong)"
                  items={terukur}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StockTable({
  title,
  items,
}: {
  title: string;
  items: InventoryItem[];
}) {
  return (
    <Card className="gap-0 overflow-hidden p-0">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <p className="font-semibold">{title}</p>
        <span className="text-xs text-muted-foreground">{items.length} bahan</span>
      </div>
      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Tidak ada bahan di kelompok ini.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Nama</th>
                <th className="px-4 py-3 font-medium">Sisa Stok</th>
                <th className="px-4 py-3 font-medium">Satuan</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item) => {
                const habis = item.stockQty <= 0;
                const menipis = !habis && item.stockQty <= 5;
                return (
                  <tr key={item.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{item.name}</td>
                    <td
                      className={cn(
                        "px-4 py-3 font-semibold tabular-nums",
                        habis && "text-destructive",
                      )}
                    >
                      {item.stockQty}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {item.unitType}
                    </td>
                    <td className="px-4 py-3">
                      {habis ? (
                        <Badge className="border-transparent bg-destructive text-[11px] text-white">
                          Habis
                        </Badge>
                      ) : menipis ? (
                        <Badge variant="warning" className="text-[11px]">
                          Menipis
                        </Badge>
                      ) : (
                        <Badge variant="success" className="text-[11px]">
                          Aman
                        </Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
