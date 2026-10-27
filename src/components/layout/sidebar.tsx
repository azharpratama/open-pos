"use client";

import { authClient } from "@/lib/auth-client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookText,
  CalendarClock,
  ClipboardList,
  Clock,
  Gift,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Package,
  Settings,
  ShoppingCart,
  Store,
  Sun,
  Users,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import useSWR from "swr";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatRupiah } from "@/lib/format";
import {
  clearRole,
  getShiftOpenServerSnapshot,
  getShiftOpenSnapshot,
  setShiftOpen,
  subscribeShiftOpen,
} from "@/lib/session";
import {
  TODAY_REVENUE_KEY,
  closeShiftRecord,
  fetchTodayRevenue,
  openShiftRecord,
} from "@/lib/shifts";
import {
  getPendingOfflineTotal,
  subscribeOfflineQueue,
} from "@/lib/offline-queue";
import {
  fetchCurrentShift,
  shiftLabel,
  type CurrentShiftInfo,
} from "@/lib/current-shift";
import { NetworkStatus } from "@/components/network-status";
import PrinterStatus from "@/components/kasir/printer-status";
import { BrandLogo } from "@/components/brand-logo";
import { STORE_CONFIG } from "@/config/store";

type Variant = "owner" | "kasir";
type NavKey = "pesan" | "antrian" | "stok" | "bonus" | "struk" | string;

const KASIR_NAV = [
  { key: "pesan", label: "Pesan", href: "/kasir/pesan", icon: UtensilsCrossed },
  { key: "antrian", label: "Antrian", href: "/kasir/antrian", icon: ClipboardList },
  { key: "stok", label: "Stok & Bahan", href: "/kasir/stok", icon: Package },
  { key: "bonus", label: "Klaim Bonus", href: "/kasir/bonus", icon: Gift },
];

const OWNER_NAV = [
  { key: "dashboard", label: "Dashboard", href: "/owner", icon: LayoutDashboard },
  { key: "pembukuan", label: "Pembukuan", href: "/owner/pembukuan", icon: BookText },
  { key: "reservation", label: "Reservasi", href: "/owner/reservation", icon: CalendarClock },
  { key: "karyawan", label: "Karyawan", href: "/owner/karyawan", icon: Users },
  { key: "shift", label: "Shift", href: "/owner/shift", icon: Clock },
  { key: "menu", label: "Menu", href: "/owner/menu", icon: UtensilsCrossed },
  { key: "inventory", label: "Inventory", href: "/owner/inventory", icon: Package },
  { key: "procurement", label: "Procurement", href: "/owner/procurement", icon: ShoppingCart },
];

const NAV_BY_VARIANT: Record<Variant, typeof KASIR_NAV> = {
  kasir: KASIR_NAV,
  owner: OWNER_NAV,
};

const OWNER_SETTINGS = {
  key: "settings",
  label: "Settings",
  href: "/owner/settings",
  icon: Settings,
};

function isLinkActive(href: string, pathname: string, key: string, activeKey?: string): boolean {
  if (activeKey && key === activeKey) return true;
  return href === "/owner" ? pathname === "/owner" : pathname.startsWith(href);
}

export function Sidebar({
  active,
  variant = "kasir",
  onNavigate,
}: {
  active?: NavKey | string;
  variant?: Variant;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const shiftOpen = useSyncExternalStore(
    subscribeShiftOpen,
    getShiftOpenSnapshot,
    getShiftOpenServerSnapshot,
  );
  // "Pendapatan Hari Ini" is the server's running total for the current
  // operational day, not a per-tab counter — so it survives a logout, a second
  // tab, a shift re-open, and a different device, and it always agrees with the
  // owner's recap. Polled so a second cashier's sales show up here too.
  const { data: todayRevenue, mutate: mutateRevenue } = useSWR(
    variant === "kasir" ? TODAY_REVENUE_KEY : null,
    fetchTodayRevenue,
    { refreshInterval: 30_000, revalidateOnFocus: true, keepPreviousData: true },
  );

  // Orders taken while offline are real sales the server cannot see yet, so
  // they are added on top until the queue drains and the server counts them.
  const [pendingOffline, setPendingOffline] = useState(0);

  useEffect(() => {
    let alive = true;
    const read = () => {
      void getPendingOfflineTotal().then((total) => {
        if (alive) setPendingOffline(total);
      });
    };
    read();
    const unsubscribe = subscribeOfflineQueue(() => {
      read();
      // A sync just moved queued orders into the database — refresh the server
      // total in the same beat so the number never dips while the poll catches
      // up.
      void mutateRevenue();
    });
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [mutateRevenue]);

  const shiftRevenue = (todayRevenue?.total ?? 0) + pendingOffline;

  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("openpos_sidebar_collapsed");
      if (saved === "true") {
        setIsCollapsed(true);
      }
    }
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("openpos_sidebar_collapsed", String(next));
      return next;
    });
  };

  const { data: shiftInfo, mutate: mutateShiftInfo } = useSWR<CurrentShiftInfo | null>(
    shiftOpen ? "/api/current-shift" : null,
    fetchCurrentShift,
    { fallbackData: null }
  );

  async function handleShiftButton() {
    if (shiftOpen) {
      setConfirmCloseOpen(true);
      return;
    }
    setBusy(true);
    try {
      await openShiftRecord();
      setShiftOpen(true);
      void mutateRevenue();
      try {
        const info = await fetchCurrentShift();
        mutateShiftInfo(info, false);
        toast.success(
          info.shiftType
            ? `Shift ${shiftLabel(info.shiftType)} ${info.startTime}–${info.endTime}${info.cashiers.length
              ? " · " + info.cashiers.join(", ")
              : " · belum ada penjaga"
            }`
            : "Shift dibuka (di luar jam operasional)",
        );
      } catch {
        toast.success("Shift dibuka");
      }
    } catch {
      toast.error("Gagal membuka shift");
    } finally {
      setBusy(false);
    }
  }

  async function confirmCloseShift() {
    setBusy(true);
    try {
      const revenue = await closeShiftRecord();
      toast.success(`Shift ditutup · Pendapatan ${formatRupiah(revenue)}`);
    } catch {
      toast.info("Shift ditutup");
    } finally {
      setShiftOpen(false);
      mutateShiftInfo(null, false);
      void mutateRevenue();
      setConfirmCloseOpen(false);
      setBusy(false);
    }
  }

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    try {
      await authClient.signOut();
    } catch {
      // ignore
    }

    try {
      clearRole();
      setShiftOpen(false);
      localStorage.removeItem("openpos_user_role");
      localStorage.removeItem("openpos_owner_token");
      localStorage.removeItem("openpos_kasir_pin");
      localStorage.removeItem("openpos_active_cashier");
      // The SWR cache is persisted in localStorage, so without this the next
      // account briefly sees the previous one's cached numbers.
      localStorage.removeItem("openpos-swr-cache");
      sessionStorage.clear();
      document.cookie = "openpos_session=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    } catch {
    }
    window.location.replace("/login");
  }

  return (
    <aside
      className={cn(
        "relative flex h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground select-none",
        isCollapsed ? "w-16" : "w-60"
      )}
    >
      <div className="relative flex h-16 shrink-0 items-center px-3">
        <button
          type="button"
          onClick={toggleCollapse}
          className="flex size-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          title={isCollapsed ? "Buka sidebar" : "Tutup sidebar"}
          aria-label={isCollapsed ? "Buka sidebar" : "Tutup sidebar"}
        >
          <Menu className="size-5 shrink-0" />
        </button>
        {!isCollapsed && (
          <div className="flex items-center gap-2.5 ml-1 overflow-hidden min-w-0 flex-1">
            <BrandLogo size="sm" />
            <div className="flex flex-col min-w-0 flex-1">
              <p className="font-semibold leading-tight truncate text-sm">{STORE_CONFIG.shortName}</p>
              <p className="text-[10px] font-mono text-muted-foreground truncate uppercase tracking-wider">
                {variant === "owner" ? "Owner Portal" : "Kasir POS"}
              </p>
            </div>
          </div>
        )}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-3 bottom-0 border-b border-sidebar-border" />
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto p-3">
        <nav className="flex flex-col gap-1">
          {NAV_BY_VARIANT[variant].map(({ key, label, href, icon: Icon }) => {
            const activeLink = isLinkActive(href, pathname, key, active);
            return (
              <Link
                key={key}
                href={href}
                onClick={onNavigate}
                title={isCollapsed ? label : undefined}
                className={cn(
                  "flex items-center h-10 rounded-xl text-sm font-medium transition-colors overflow-hidden p-0",
                  isCollapsed ? "w-10 justify-center" : "w-full",
                  activeLink
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                <div className="flex size-10 shrink-0 items-center justify-center">
                  <Icon className="size-5 shrink-0" />
                </div>
                {!isCollapsed && (
                  <span className="whitespace-nowrap truncate pr-3">
                    {label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {variant === "owner" && (
          <div className="mt-2 flex flex-col gap-1">
            <Link
              href={OWNER_SETTINGS.href}
              onClick={onNavigate}
              title={isCollapsed ? OWNER_SETTINGS.label : undefined}
              className={cn(
                "flex items-center h-10 rounded-xl text-sm font-medium transition-colors overflow-hidden p-0",
                isCollapsed ? "w-10 justify-center" : "w-full",
                isLinkActive(OWNER_SETTINGS.href, pathname, OWNER_SETTINGS.key, active)
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
            >
              <div className="flex size-10 shrink-0 items-center justify-center">
                <OWNER_SETTINGS.icon className="size-5 shrink-0" />
              </div>
              {!isCollapsed && (
                <span className="whitespace-nowrap truncate pr-3">
                  {OWNER_SETTINGS.label}
                </span>
              )}
            </Link>
          </div>
        )}

        {variant === "kasir" && (
          <div className="my-2 border-t border-sidebar-border w-full" />
        )}

        {variant === "kasir" && !isCollapsed && (
          <div className="rounded-xl bg-sidebar-accent/40 pb-2.5">
            <div className="flex items-center h-10 text-xs font-medium text-muted-foreground">
              <div className="flex size-10 shrink-0 items-center justify-center">
                <Wallet className="size-5 shrink-0 text-muted-foreground" />
              </div>
              <span className="truncate pr-3">Pendapatan Hari Ini</span>
            </div>
            <p className="pl-10 pr-3 text-lg font-bold tabular-nums">
              {formatRupiah(shiftRevenue)}
            </p>
            <p className="mt-0.5 pl-10 pr-3 text-[11px] text-muted-foreground">
              {shiftOpen ? "Shift sedang berjalan" : "Shift ditutup"}
            </p>
          </div>
        )}

        {variant === "kasir" && !isCollapsed && shiftOpen && shiftInfo && (
          <div className="mt-2 rounded-xl bg-sidebar-accent/40 pb-2.5">
            <div className="flex items-center h-10 text-xs font-medium text-muted-foreground">
              <div className="flex size-10 shrink-0 items-center justify-center">
                <Clock className="size-5 shrink-0 text-muted-foreground" />
              </div>
              <span className="truncate pr-3">
                {shiftInfo.shiftType
                  ? `Shift ${shiftLabel(shiftInfo.shiftType)}`
                  : "Di luar jam operasional"}
              </span>
            </div>
            {shiftInfo.shiftType && (
              <p className="pl-10 pr-3 text-sm font-semibold tabular-nums">
                {shiftInfo.startTime}–{shiftInfo.endTime}
              </p>
            )}
            <p className="mt-0.5 pl-10 pr-3 text-[11px] text-muted-foreground">
              {shiftInfo.cashiers.length
                ? shiftInfo.cashiers.join(", ")
                : "Belum ada penjaga terjadwal"}
            </p>
          </div>
        )}

        {variant === "kasir" && isCollapsed && (
          <div className="flex flex-col gap-1.5 w-full">
            <button
              type="button"
              onClick={() => toast.info(`Pendapatan Hari Ini: ${formatRupiah(shiftRevenue)}`, { description: shiftOpen ? "Shift sedang berjalan" : "Shift ditutup" })}
              className="flex items-center h-10 w-10 justify-center rounded-xl bg-sidebar-accent/40 text-sidebar-foreground hover:bg-sidebar-accent transition-colors overflow-hidden"
              title={`Pendapatan Hari Ini: ${formatRupiah(shiftRevenue)}`}
            >
              <div className="flex size-10 shrink-0 items-center justify-center">
                <Wallet className="size-5 shrink-0 text-muted-foreground" />
              </div>
            </button>
            {shiftOpen && shiftInfo && (
              <button
                type="button"
                onClick={() => toast.info(shiftInfo.shiftType ? `Shift ${shiftLabel(shiftInfo.shiftType)}` : "Di luar jam operasional", { description: `${shiftInfo.startTime || ""}–${shiftInfo.endTime || ""} · ${shiftInfo.cashiers.length ? shiftInfo.cashiers.join(", ") : "Belum ada penjaga"}` })}
                className="flex items-center h-10 w-10 justify-center rounded-xl bg-sidebar-accent/40 text-sidebar-foreground hover:bg-sidebar-accent transition-colors overflow-hidden"
                title={shiftInfo.shiftType ? `Shift ${shiftLabel(shiftInfo.shiftType)}` : "Shift Aktif"}
              >
                <div className="flex size-10 shrink-0 items-center justify-center">
                  <Clock className="size-5 shrink-0 text-muted-foreground" />
                </div>
              </button>
            )}
          </div>
        )}

        <div className="mt-auto flex flex-col gap-1.5 pt-2 border-t border-sidebar-border w-full">
          {variant === "kasir" && (
            <button
              type="button"
              className={cn(
                "flex items-center h-10 rounded-xl text-sm font-medium transition-colors overflow-hidden p-0",
                isCollapsed ? "w-10 justify-center" : "w-full",
                shiftOpen
                  ? "bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/80"
                  : "bg-primary text-primary-foreground hover:bg-primary/90",
                busy && "opacity-50 pointer-events-none"
              )}
              disabled={busy}
              onClick={handleShiftButton}
              title={shiftOpen ? "Tutup Shift" : "Buka Shift"}
            >
              <div className="flex size-10 shrink-0 items-center justify-center">
                <Store className="size-5 shrink-0" />
              </div>
              {!isCollapsed && (
                <span className="whitespace-nowrap truncate pr-3">
                  {shiftOpen ? "Tutup Shift" : "Buka Shift"}
                </span>
              )}
            </button>
          )}
          <NetworkStatus collapsed={isCollapsed} />
          <PrinterStatus collapsed={isCollapsed} />
          <button
            type="button"
            className={cn(
              "flex items-center h-10 rounded-xl text-sm font-medium text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground transition-colors overflow-hidden p-0",
              isCollapsed ? "w-10 justify-center" : "w-full"
            )}
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            title={resolvedTheme === "dark" ? "Beralih ke Tema Terang" : "Beralih ke Tema Gelap"}
          >
            <div className="flex size-10 shrink-0 items-center justify-center">
              {resolvedTheme === "dark" ? <Sun className="size-5 shrink-0" /> : <Moon className="size-5 shrink-0" />}
            </div>
            {!isCollapsed && (
              <span className="whitespace-nowrap truncate pr-3">
                {resolvedTheme === "dark" ? "Tema Terang" : "Tema Gelap"}
              </span>
            )}
          </button>
          <button
            type="button"
            className={cn(
              "flex items-center h-10 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors overflow-hidden p-0",
              isCollapsed ? "w-10 justify-center" : "w-full"
            )}
            onClick={handleLogout}
            title="Logout"
          >
            <div className="flex size-10 shrink-0 items-center justify-center">
              <LogOut className="size-5 shrink-0" />
            </div>
            {!isCollapsed && (
              <span className="whitespace-nowrap truncate pr-3">
                Logout
              </span>
            )}
          </button>
        </div>
      </div>

      <Dialog open={confirmCloseOpen} onOpenChange={setConfirmCloseOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Tutup shift sekarang?</DialogTitle>
            <DialogDescription>
              Pendapatan hari ini {formatRupiah(shiftRevenue)} akan direkap.
              Kasir tidak bisa menerima pesanan sampai shift dibuka lagi.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmCloseOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={busy}
              onClick={confirmCloseShift}
            >
              Tutup Shift
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
