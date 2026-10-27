import { revokeUserSessions } from "@/lib/procedures/admin";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { conn } from "@/db";
import {
  verifySessionToken,
  hashPassword,
  SESSION_COOKIE_NAME,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { newPassword } = (body ?? {}) as { newPassword?: unknown };
  if (typeof newPassword !== "string" || !newPassword) {
    return NextResponse.json(
      { error: "Password baru wajib diisi" },
      { status: 400 }
    );
  }
  if (newPassword.length < 6) {
    return NextResponse.json(
      { error: "Password baru minimal 6 karakter" },
      { status: 400 }
    );
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
  }

  if (session.role !== "OWNER") {
    return NextResponse.json({ error: "Akses khusus owner" }, { status: 403 });
  }

  try {
    const kasirs = await conn`
      SELECT id FROM public.users WHERE role = 'karyawan'
    `;

    if (!kasirs || kasirs.length === 0) {
      return NextResponse.json(
        { error: "Akun kasir tidak ditemukan" },
        { status: 404 }
      );
    }
    if (kasirs.length > 1) {
      return NextResponse.json(
        { error: "Ada lebih dari satu akun kasir; tidak bisa direset otomatis" },
        { status: 409 }
      );
    }

    const kasirId = kasirs[0].id;
    const newHash = hashPassword(newPassword);

    await conn`
      UPDATE public.users
      SET password_hash = ${newHash}
      WHERE id = ${kasirId}
    `;

    // Revoke sessions via procedure
    await revokeUserSessions(conn, { uid: kasirId });

    return NextResponse.json({
      data: { ok: true, sessionsRevoked: true },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Gagal memperbarui password kasir" },
      { status: 500 }
    );
  }
}
