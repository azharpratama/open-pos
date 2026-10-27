"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { usePathname } from "next/navigation";
import {
  BookText,
  CalendarClock,
  LayoutDashboard,
  Menu as MenuIcon,
  Package,
  Settings,
  ShoppingCart,
  Users,
  UtensilsCrossed,
} from "lucide-react";

import { HeaderBar } from "@/components/layout/header-bar";
import { Sidebar } from "@/components/layout/sidebar";

const NAV = [
  {
    label: "Dashboard",
    href: "/owner",
    icon: LayoutDashboard,
    desc: "Ringkasan performa operasional POS",
  },
  {
    label: "Pembukuan",
    href: "/owner/pembukuan",
    icon: BookText,
    desc: "Laporan laba rugi & buku kas",
  },
  {
    label: "Reservasi",
    href: "/owner/reservation",
    icon: CalendarClock,
    desc: "Manajemen jadwal & ketersediaan tempat",
  },
  {
    label: "Karyawan",
    href: "/owner/karyawan",
    icon: Users,
    desc: "Data karyawan & payroll",
  },
  {
    label: "Shift",
    href: "/owner/shift",
    icon: CalendarClock,
    desc: "Jadwal jam operasional per hari",
  },
  {
    label: "Menu",
    href: "/owner/menu",
    icon: UtensilsCrossed,
    desc: "Menu jual & resep bahan",
  },
  {
    label: "Inventory",
    href: "/owner/inventory",
    icon: Package,
    desc: "Stok bahan baku",
  },
  {
    label: "Procurement",
    href: "/owner/procurement",
    icon: ShoppingCart,
    desc: "Supplier & pencatatan pembelian",
  },
];

// Sits at the bottom, above Logout — not part of the main nav list.
const SETTINGS = {
  label: "Pengaturan",
  href: "/owner/settings",
  icon: Settings,
  desc: "Ubah password & clear dataset",
};

function isActive(href: string, pathname: string): boolean {
  return href === "/owner" ? pathname === "/owner" : pathname.startsWith(href);
}

export default function OwnerLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);

  const current = isActive(SETTINGS.href, pathname)
    ? SETTINGS
    : (NAV.find((n) => isActive(n.href, pathname)) ?? NAV[0]);

  return (
    <div className="flex h-dvh bg-background">
      {/* Desktop / tablet sidebar */}
      <div className="hidden lg:block">
        <Sidebar variant="owner" />
      </div>

      {/* Mobile drawer */}
      {navOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={() => setNavOpen(false)}
            aria-label="Tutup menu"
          />
          <div className="absolute inset-y-0 left-0">
            <Sidebar variant="owner" onNavigate={() => setNavOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <HeaderBar
          title={current.label}
          subtitle={current.desc}
          onOpenMobileNav={() => setNavOpen(true)}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
