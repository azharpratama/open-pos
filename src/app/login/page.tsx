"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Eye,
  EyeOff,
  Loader2,
  LogIn,
  Moon,
  ShieldCheck,
  Store,
  Sun,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { setRole, setShiftOpen, type Role } from "@/lib/session";
import { BrandLogo } from "@/components/brand-logo";
import { STORE_CONFIG } from "@/config/store";

const ROLE_HOME: Record<Role, string> = {
  KASIR: "/kasir/pesan",
  OWNER: "/owner",
};

export default function LoginPage() {
  const router = useRouter();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [loginType, setLoginType] = useState<Role>("KASIR");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    if (loading) return;
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // `as` tells the backend which section this login came from; an owner
        // account signing in through the Kasir tab (or vice versa) is rejected.
        body: JSON.stringify({ email, password, as: loginType }),
      });
      const json = await res.json();

      if (!res.ok) {
        setErrorMessage(json.error ?? "Gagal masuk. Coba lagi.");
        return;
      }

      const role = json.data.role as Role;
      setRole(role);
      if (role === "KASIR") {
        setShiftOpen(true);
      }
      window.location.replace(ROLE_HOME[role]);
    } catch {
      setErrorMessage("Tidak dapat terhubung ke server. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center bg-gradient-to-br from-accent/60 via-background to-background dark:from-background dark:via-background dark:to-background px-4">
      {/* Theme Toggle Button in top right */}
      {mounted && (
        <Button
          variant="outline"
          size="icon"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          className="absolute right-4 top-4 sm:right-6 sm:top-6 size-10 rounded-xl shadow-xs transition-colors"
          title={resolvedTheme === "dark" ? "Ubah ke Mode Terang" : "Ubah ke Mode Gelap"}
          aria-label={resolvedTheme === "dark" ? "Ubah ke Mode Terang" : "Ubah ke Mode Gelap"}
        >
          {resolvedTheme === "dark" ? (
            <Sun className="size-4 text-warning" />
          ) : (
            <Moon className="size-4 text-muted-foreground" />
          )}
        </Button>
      )}
      <div className="flex w-full max-w-sm flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <BrandLogo size="xl" />
          <div>
            <h1 className="text-2xl font-bold">{STORE_CONFIG.shortName} POS</h1>
            <p className="text-muted-foreground">
              {loginType === "OWNER"
                ? "Masuk ke dashboard Owner"
                : "Masuk ke terminal Kasir"}
            </p>
          </div>
        </div>

        <Card className="w-full gap-0 p-6">
          <Tabs
            value={loginType}
            onValueChange={(value) => {
              setLoginType(value as Role);
              setErrorMessage(null);
            }}
            className="mb-5"
          >
            <TabsList className="w-full">
              <TabsTrigger value="KASIR">
                <Store className="size-4" />
                Kasir
              </TabsTrigger>
              <TabsTrigger value="OWNER">
                <ShieldCheck className="size-4" />
                Owner
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder={loginType === "OWNER" ? "owner@openpos.dev" : "kasir@openpos.dev"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Password Anda"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={
                    showPassword ? "Sembunyikan password" : "Tampilkan password"
                  }
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
            </div>

            {errorMessage && (
              <p
                role="alert"
                className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
              >
                {errorMessage}
              </p>
            )}

            <Button
              type="submit"
              size="lg"
              className="mt-1 h-11 w-full text-base font-semibold"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <LogIn className="size-4" />
                  {loginType === "OWNER" ? "Masuk sebagai Owner" : "Masuk sebagai Kasir"}
                </>
              )}
            </Button>
          </form>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Gunakan akun {loginType === "OWNER" ? "owner" : "kasir"} Anda. Akun{" "}
            {loginType === "OWNER" ? "kasir" : "owner"} tidak bisa masuk di sini.
          </p>

          <div className="mt-5 pt-4 border-t border-border flex flex-col gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-center">
              Akses Cepat Demo Sandbox
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs h-8"
                onClick={() => {
                  setLoginType("KASIR");
                  setEmail("kasir@openpos.dev");
                  setPassword("password123");
                  setErrorMessage(null);
                }}
              >
                <Store className="size-3.5 mr-1 text-primary" /> Akun Kasir
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs h-8"
                onClick={() => {
                  setLoginType("OWNER");
                  setEmail("owner@openpos.dev");
                  setPassword("password123");
                  setErrorMessage(null);
                }}
              >
                <ShieldCheck className="size-3.5 mr-1 text-primary" /> Akun Owner
              </Button>
            </div>
          </div>
        </Card>

        <p className="text-center font-mono text-xs text-muted-foreground">
          {STORE_CONFIG.name} &middot; Terminal 01
        </p>
      </div>
    </div>
  );
}
