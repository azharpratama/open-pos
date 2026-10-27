import { NextResponse } from "next/server";
import { conn } from "@/db";
import { setSessionCookie, verifyPassword, hashPassword, type SessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const ROLE_MAP: Record<string, "OWNER" | "KASIR"> = {
  owner: "OWNER",
  karyawan: "KASIR",
};

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { email, password, as } = (body ?? {}) as {
    email?: unknown;
    password?: unknown;
    as?: unknown;
  };

  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    return NextResponse.json(
      { error: "Email dan password wajib diisi" },
      { status: 400 }
    );
  }

  const expectedRole =
    as === "OWNER" || as === "KASIR" ? (as as "OWNER" | "KASIR") : null;

  try {
    const isDemo =
      process.env.DEMO_MODE === "true" ||
      process.env.NEXT_PUBLIC_DEMO_MODE === "true" ||
      process.env.VERCEL === "1" ||
      !process.env.DATABASE_URL;

    if (isDemo) {
      const cleanEmail = email.trim().toLowerCase();
      const isOwner = cleanEmail === "owner@openpos.dev";
      const isKasir = cleanEmail === "kasir@openpos.dev";

      if ((isOwner && password === "password123") || (isKasir && password === "password123")) {
        const appRole = isOwner ? "OWNER" : "KASIR";
        if (expectedRole && appRole !== expectedRole) {
          return NextResponse.json(
            {
              error:
                expectedRole === "OWNER"
                  ? "Akun ini bukan akun owner. Gunakan login Kasir."
                  : "Akun ini bukan akun kasir. Gunakan login Owner.",
            },
            { status: 403 }
          );
        }
        const sessionUser: SessionUser = {
          id: isOwner ? "demo-owner-id" : "demo-kasir-id",
          email: cleanEmail,
          role: appRole,
          name: isOwner ? "Owner OpenPOS" : "Kasir OpenPOS",
        };
        const response = NextResponse.json({
          data: {
            role: appRole,
            name: sessionUser.name,
          },
        });
        await setSessionCookie(response, sessionUser);
        return response;
      }
    }

    const rows = await conn`
      SELECT id, email, role, name, password_hash
      FROM public.users
      WHERE email = ${email.trim().toLowerCase()}
      LIMIT 1
    `;

    const user = rows[0];
    if (!user) {
      return NextResponse.json(
        { error: "Email atau password salah" },
        { status: 401 }
      );
    }

    const appRole = ROLE_MAP[user.role];
    if (!appRole) {
      return NextResponse.json(
        { error: "Akun ini belum memiliki peran (owner/karyawan)" },
        { status: 403 }
      );
    }

    // Verify password
    let isValid = false;
    if (user.password_hash) {
      isValid = verifyPassword(password, user.password_hash);
    } else {
      // Default credentials fallback for initial setup / test accounts
      const defaultOwnerPass = process.env.TEST_OWNER_PASSWORD || "password123";
      const defaultKasirPass = process.env.TEST_KASIR_PASSWORD || "password123";
      isValid =
        (appRole === "OWNER" && password === defaultOwnerPass) ||
        (appRole === "KASIR" && password === defaultKasirPass);

      // Lazily set hash if authenticated
      if (isValid) {
        await conn`
          UPDATE public.users
          SET password_hash = ${hashPassword(password)}
          WHERE id = ${user.id}
        `;
      }
    }

    if (!isValid) {
      return NextResponse.json(
        { error: "Email atau password salah" },
        { status: 401 }
      );
    }

    if (expectedRole && appRole !== expectedRole) {
      return NextResponse.json(
        {
          error:
            expectedRole === "OWNER"
              ? "Akun ini bukan akun owner. Gunakan login Kasir."
              : "Akun ini bukan akun kasir. Gunakan login Owner.",
        },
        { status: 403 }
      );
    }

    const sessionUser: SessionUser = {
      id: user.id,
      email: user.email,
      role: appRole,
      name: user.name,
    };

    const response = NextResponse.json({
      data: {
        role: appRole,
        name: user.name,
      },
    });

    await setSessionCookie(response, sessionUser);
    return response;
  } catch (err: any) {
    // Graceful fallback if database connection is unavailable (e.g. standalone demo deployment)
    const cleanEmail = email.trim().toLowerCase();
    const isOwner = cleanEmail === "owner@openpos.dev";
    const isKasir = cleanEmail === "kasir@openpos.dev";

    if ((isOwner && password === "password123") || (isKasir && password === "password123")) {
      const appRole = isOwner ? "OWNER" : "KASIR";
      if (expectedRole && appRole !== expectedRole) {
        return NextResponse.json(
          {
            error:
              expectedRole === "OWNER"
                ? "Akun ini bukan akun owner. Gunakan login Kasir."
                : "Akun ini bukan akun kasir. Gunakan login Owner.",
          },
          { status: 403 }
        );
      }
      const sessionUser: SessionUser = {
        id: isOwner ? "demo-owner-id" : "demo-kasir-id",
        email: cleanEmail,
        role: appRole,
        name: isOwner ? "Owner OpenPOS" : "Kasir OpenPOS",
      };
      const response = NextResponse.json({
        data: {
          role: appRole,
          name: sessionUser.name,
        },
      });
      await setSessionCookie(response, sessionUser);
      return response;
    }

    return NextResponse.json(
      { error: err.message || "Gagal melakukan autentikasi" },
      { status: 500 }
    );
  }
}
