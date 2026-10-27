"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { clearRole } from "@/lib/session";

function PasswordInput({
  id,
  label,
  value,
  onChange,
  show,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  autoComplete: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10"
      />
    </div>
  );
}

function ShowToggle({
  show,
  onToggle,
}: {
  show: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center gap-1.5 self-start text-xs font-medium text-muted-foreground hover:text-foreground"
    >
      {show ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
      {show ? "Sembunyikan password" : "Tampilkan password"}
    </button>
  );
}

function OwnerPasswordCard() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    if (busy) return;
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Semua kolom wajib diisi");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password baru minimal 6 karakter");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Konfirmasi password tidak cocok");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Gagal mengganti password");
        return;
      }
      // Password changed → the current session must end. Sign out on the server,
      // drop local role state, then hard-navigate to /login so the middleware
      // re-runs from scratch and no stale session survives.
      toast.success("Password diganti. Silakan masuk kembali.");
      try {
        await fetch("/api/auth/logout", { method: "POST" });
      } catch {
        // Non-fatal: still clear locally and redirect.
      }
      clearRole();
      window.location.href = "/login";
    } catch {
      toast.error("Tidak dapat terhubung ke server. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="size-4" />
          Password Saya (Owner)
        </CardTitle>
        <CardDescription>
          Ganti password akun owner Anda. Setelah diganti, Anda akan keluar dan
          harus masuk kembali dengan password baru.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <PasswordInput
            id="owner-current"
            label="Password Lama"
            value={currentPassword}
            onChange={setCurrentPassword}
            show={show}
            autoComplete="current-password"
          />
          <PasswordInput
            id="owner-new"
            label="Password Baru"
            value={newPassword}
            onChange={setNewPassword}
            show={show}
            autoComplete="new-password"
          />
          <PasswordInput
            id="owner-confirm"
            label="Konfirmasi Password Baru"
            value={confirmPassword}
            onChange={setConfirmPassword}
            show={show}
            autoComplete="new-password"
          />
          <ShowToggle show={show} onToggle={() => setShow((v) => !v)} />
          <Button type="submit" disabled={busy} className="self-start">
            {busy ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              "Simpan Password Owner"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function KasirPasswordCard() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    if (busy) return;
    if (!newPassword || !confirmPassword) {
      toast.error("Semua kolom wajib diisi");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password baru minimal 6 karakter");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Konfirmasi password tidak cocok");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/change-kasir-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Gagal mengganti password kasir");
        return;
      }
      toast.success(
        "Password kasir diganti. Kasir akan diminta masuk kembali dengan password baru.",
      );
      setNewPassword("");
      setConfirmPassword("");
      setShow(false);
    } catch {
      toast.error("Tidak dapat terhubung ke server. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="size-4" />
          Password Kasir
        </CardTitle>
        <CardDescription>
          Reset password akun kasir. Sesi kasir yang sedang berjalan akan diputus
          dan harus masuk kembali dengan password baru.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <PasswordInput
            id="kasir-new"
            label="Password Baru Kasir"
            value={newPassword}
            onChange={setNewPassword}
            show={show}
            autoComplete="new-password"
          />
          <PasswordInput
            id="kasir-confirm"
            label="Konfirmasi Password Baru"
            value={confirmPassword}
            onChange={setConfirmPassword}
            show={show}
            autoComplete="new-password"
          />
          <ShowToggle show={show} onToggle={() => setShow((v) => !v)} />
          <Button type="submit" disabled={busy} className="self-start">
            {busy ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              "Reset Password Kasir"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function OwnerPasswordSettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/owner/settings"
        className="flex items-center gap-1.5 self-start text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Kembali ke Pengaturan
      </Link>
      <OwnerPasswordCard />
      <KasirPasswordCard />
    </div>
  );
}
