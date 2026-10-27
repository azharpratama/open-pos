import Link from "next/link";
import { ChevronRight, DatabaseZap, KeyRound } from "lucide-react";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const ITEMS = [
  {
    href: "/owner/settings/password",
    icon: KeyRound,
    title: "Ubah Password",
    desc: "Ganti password akun owner Anda atau reset password akun kasir.",
    tone: "default" as const,
  },
  {
    href: "/owner/settings/cleardataset",
    icon: DatabaseZap,
    title: "Clear Dataset",
    desc: "Hapus data penjualan, pembukuan, karyawan, menu, inventory, procurement, atau reset semuanya. Akun login tetap aman.",
    tone: "danger" as const,
  },
  {
    href: "/owner/settings/backup",
    icon: DatabaseZap,
    title: "Database Backup",
    desc: "Unduh file cadangan database harian (.sql.gz) yang dibuat secara otomatis.",
    tone: "default" as const,
  },
];

export default function OwnerSettingsPage() {
  return (
    <div className="flex max-w-xl flex-col gap-3">
      {ITEMS.map(({ href, icon: Icon, title, desc, tone }) => (
        <Link key={href} href={href} className="group block">
          <Card className="transition-colors group-hover:border-foreground/20 group-hover:bg-muted/40">
            <CardHeader className="flex items-center gap-4">
              <div
                className={
                  tone === "danger"
                    ? "flex size-11 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive"
                    : "flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
                }
              >
                <Icon className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle>{title}</CardTitle>
                <CardDescription className="mt-1">{desc}</CardDescription>
              </div>
              <ChevronRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </CardHeader>
          </Card>
        </Link>
      ))}
    </div>
  );
}
