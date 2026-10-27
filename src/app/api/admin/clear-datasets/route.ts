import { adminClearDatasets } from "@/lib/procedures/admin";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { conn } from "@/db";
import {
  verifySessionToken,
  verifyPassword,
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

  const { targets, password } = (body ?? {}) as {
    targets?: unknown;
    password?: unknown;
  };

  if (!Array.isArray(targets) || targets.length === 0) {
    return NextResponse.json(
      { error: "Pilih minimal satu dataset untuk dihapus" },
      { status: 400 }
    );
  }

  if (typeof password !== "string" || !password) {
    return NextResponse.json(
      { error: "Password owner wajib diisi untuk konfirmasi" },
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
    const rows = await conn`
      SELECT id, role, password_hash
      FROM public.users
      WHERE id = ${session.id}
      LIMIT 1
    `;

    const user = rows[0];
    if (!user) {
      return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 });
    }

    let isValid = false;
    if (user.password_hash) {
      isValid = verifyPassword(password, user.password_hash);
    } else {
      const defaultPass = process.env.TEST_OWNER_PASSWORD || "password123";
      isValid = password === defaultPass;
    }

    if (!isValid) {
      return NextResponse.json(
        { error: "Password konfirmasi salah" },
        { status: 401 }
      );
    }

    // Call TypeScript procedure
    const [result] = await adminClearDatasets(conn, { targets });
    return NextResponse.json({ data: result || {} });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Gagal menghapus dataset" },
      { status: 500 }
    );
  }
}
