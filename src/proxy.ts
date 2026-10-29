import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";

// Routes only an OWNER may reach (pages + management APIs).
const OWNER_ONLY = [
  "/owner",
  "/api/employees",
  "/api/suppliers",
  "/api/purchases",
  "/api/menu-items",
  "/api/shift-schedules",
  "/api/dashboard",
  "/api/salary",
  "/api/admin",
  "/api/reservations", // Owner creates/manages reservations
  "/api/app-settings", // Owner-only settings
];

function ownerRequired(path: string, method: string): boolean {
  if (OWNER_ONLY.some((p) => path === p || path.startsWith(`${p}/`))) {
    // Kasir can READ reservations (to display in antrian)
    if (
      (path === "/api/reservations" || path.startsWith("/api/reservations/")) &&
      (method === "GET" || method === "HEAD" || method === "PATCH")
    ) {
      return false;
    }
    return true;
  }
  const isMutation = method !== "GET" && method !== "HEAD";
  if (!isMutation) return false;
  if (path === "/api/inventory" || path.startsWith("/api/inventory/")) return true;
  if (path === "/api/bonuses") return true;
  return false;
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = token ? await verifySessionToken(token) : null;
  const role = user?.role;
  const isApi = path.startsWith("/api");
  const home = role === "OWNER" ? "/owner" : "/kasir/pesan";

  // Public: login page + auth endpoints. Signed-in users skip the login page.
  if (path === "/login" || path.startsWith("/api/auth")) {
    if (path === "/login" && user) {
      return NextResponse.redirect(new URL(home, request.url));
    }
    return NextResponse.next();
  }

  // Root just points at the right place.
  if (path === "/") {
    return NextResponse.redirect(new URL(user ? home : "/login", request.url));
  }

  // Everything else requires a valid session.
  if (!user) {
    if (isApi) {
      return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Owner-only areas.
  if (ownerRequired(path, request.method) && role !== "OWNER") {
    if (isApi) {
      return NextResponse.json({ error: "Akses khusus owner" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/kasir/pesan", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except Next internals and public files the browser fetches
  // before a session exists (service worker, manifest, icons).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
