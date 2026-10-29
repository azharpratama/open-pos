import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { conn } from "@/db";
import {
  verifySessionToken,
  verifyPassword,
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

  const { currentPassword, newPassword } = (body ?? {}) as {
    currentPassword?: unknown;
    newPassword?: unknown;
  };

  if (
    typeof currentPassword !== "string" ||
    typeof newPassword !== "string" ||
    !currentPassword ||
    !newPassword
  ) {
    return NextResponse.json(
      { error: "Password lama dan baru wajib diisi" },
      { status: 400 }
    );
  }

  if (newPassword.length < 6) {
    return NextResponse.json(
      { error: "Password baru minimal 6 karakter" },
      { status: 400 }
    );
  }

  if (newPassword === currentPassword) {
    return NextResponse.json(
      { error: "Password baru tidak boleh sama dengan password lama" },
      { status: 400 }
    );
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
  }

  if (!process.env.DATABASE_URL) {
    if (currentPassword === "password123") {
      return NextResponse.json({ data: { ok: true } });
    }
    return NextResponse.json(
      { error: "Password lama salah" },
      { status: 401 }
    );
  }

  try {
    const rows = await conn`
      SELECT id, email, role, password_hash
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
      isValid = verifyPassword(currentPassword, user.password_hash);
    } else {
      const defaultPass =
        session.role === "OWNER"
          ? process.env.TEST_OWNER_PASSWORD || "password123"
          : process.env.TEST_KASIR_PASSWORD || "password123";
      isValid = currentPassword === defaultPass;
    }

    if (!isValid) {
      return NextResponse.json(
        { error: "Password lama salah" },
        { status: 401 }
      );
    }

    const newHash = hashPassword(newPassword);
    await conn`
      UPDATE public.users
      SET password_hash = ${newHash}
      WHERE id = ${user.id}
    `;

    return NextResponse.json({ data: { ok: true } });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Gagal memperbarui password" },
      { status: 500 }
    );
  }
}
