"use client";

import type { ReactNode } from "react";
import { useState, useEffect } from "react";
import { Bell, RefreshCw, Menu as MenuIcon, Sparkles } from "lucide-react";
import { isDemoMode, resetSandboxData } from "@/lib/demo-sandbox";
import { toast } from "sonner";
import { useSWRConfig } from "swr";
import { WibClock } from "@/components/kasir/wib-clock";
import { cn } from "@/lib/utils";

interface HeaderBarProps {
  title?: string;
  subtitle?: string;
  onRefresh?: () => void;
  onOpenMobileNav?: () => void;
  children?: ReactNode;
}

export function HeaderBar({
  title,
  subtitle,
  onRefresh,
  onOpenMobileNav,
  children,
}: HeaderBarProps) {
  const { mutate } = useSWRConfig();
  const [spinning, setSpinning] = useState(false);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    setIsDemo(isDemoMode());
  }, []);

  const handleRefresh = async () => {
    setSpinning(true);
    try {
      if (onRefresh) {
        await onRefresh();
      } else {
        await mutate(() => true);
      }
      toast.success("Data diperbarui");
    } catch {
      toast.error("Gagal memperbarui data");
    } finally {
      setTimeout(() => setSpinning(false), 400);
    }
  };

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-sidebar-border bg-background px-4 sm:px-6">
      {/* Left side: Mobile nav toggle + Page Title / Search input / Children */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {onOpenMobileNav && (
          <button
            type="button"
            onClick={onOpenMobileNav}
            className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted lg:hidden shrink-0"
            aria-label="Buka menu"
          >
            <MenuIcon className="size-5" />
          </button>
        )}

        {title && (
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold leading-tight">{title}</h1>
            {subtitle && (
              <p className="hidden truncate text-xs text-muted-foreground sm:block">{subtitle}</p>
            )}
          </div>
        )}

        {children}
      </div>

      {/* Top Right Controls: Notification, Refresh, Date/Time Pill */}
      <div className="ml-auto flex items-center gap-2 sm:gap-2.5 shrink-0">
        {isDemo && (
          <button
            type="button"
            onClick={() => {
              resetSandboxData();
              mutate(() => true);
              toast.success("Sandbox demo telah direset ke data awal");
            }}
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
            title="Klik untuk mereset seluruh data sandbox ke kondisi awal"
          >
            <Sparkles className="size-3" />
            <span>Reset Demo</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => toast.info("Belum ada notifikasi baru")}
          className="flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted transition-colors"
          aria-label="Notifikasi"
          title="Notifikasi"
        >
          <Bell className="size-4.5" />
        </button>

        <button
          type="button"
          onClick={handleRefresh}
          className="flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted transition-colors"
          aria-label="Segarkan data"
          title="Segarkan data"
        >
          <RefreshCw className={cn("size-4.5 transition-transform", spinning && "animate-spin text-primary")} />
        </button>

        <WibClock />
      </div>
    </header>
  );
}
