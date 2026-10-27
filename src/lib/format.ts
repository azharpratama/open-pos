// All date/time display is pinned to WIB (Asia/Jakarta) so the app reads the
// same on any device regardless of the browser's local timezone.
const WIB = "Asia/Jakarta";

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

function parseUTC(iso: string): Date {
  if (!iso) return new Date();
  const base = iso.replace(" ", "T");
  const normalized = /[+-]\d{2}$/.test(base) ? `${base}:00` : base;
  if (!normalized.endsWith("Z") && !normalized.match(/[+-]\d{2}(?::?\d{2})?$/)) {
    return new Date(normalized + "Z");
  }
  return new Date(normalized);
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: WIB,
  }).format(parseUTC(iso));
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: WIB,
  }).format(parseUTC(iso));
}

// Today's date in WIB as YYYY-MM-DD (en-CA yields that exact ISO-date format).
// Safe on both server and client — used to key the daily cashier roster.
export function todayWIB(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: WIB,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

// Shifts a YYYY-MM-DD date string by N days (UTC-safe, timezone-agnostic).
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// First day of the current WIB month as YYYY-MM-DD (e.g. "2026-07-01"). Matches
// Postgres date_trunc('month', today) used by the dashboard aggregates.
export function startOfMonthWIB(): string {
  return `${todayWIB().slice(0, 7)}-01`;
}

// Monday of the current WIB week as YYYY-MM-DD. Matches Postgres
// date_trunc('week', today), which is Monday-based, so the dashboard's
// "Minggu Ini" column and the bookkeeping report agree.
export function startOfWeekWIB(): string {
  const today = todayWIB();
  const dow = new Date(`${today}T00:00:00Z`).getUTCDay(); // 0=Sun … 6=Sat
  const backToMonday = (dow + 6) % 7;
  return addDays(today, -backToMonday);
}

// Reformats a YYYY-MM-DD date string as DD/MM/YYYY (no timezone math needed —
// the input is already a calendar date).
export function formatDateShort(date: string): string {
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}

// Current hour (0–23) in WIB.
export function wibHour(): number {
  return (
    Number(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: WIB,
        hour: "2-digit",
        hour12: false,
      }).format(new Date()),
    ) % 24
  );
}

// The "operational day" counts late-night hours (00:00–02:00 WIB) as the
// previous calendar day, because the malam shift (17:00–02:00) belongs to its
// start date. Used to pick which day's roster/shift is currently active.
export function operationalDateWIB(): string {
  const today = todayWIB();
  return wibHour() < 2 ? addDays(today, -1) : today;
}

export type CurrentShift = {
  type: "SIANG" | "MALAM";
  start: string;
  end: string;
} | null;

// Which fixed shift is active right now (WIB), or null when the cafe is closed
// (02:00–09:00).
export function currentShift(): CurrentShift {
  const h = wibHour();
  if (h >= 9 && h < 17) return { type: "SIANG", start: "09:00", end: "17:00" };
  if (h >= 17 || h < 2) return { type: "MALAM", start: "17:00", end: "02:00" };
  return null;
}

// Human-friendly WIB date, e.g. "Rabu, 16 Juli 2026". Accepts a YYYY-MM-DD
// string or a Date.
export function formatDateLong(date: string | Date): string {
  const d =
    typeof date === "string" ? new Date(`${date}T00:00:00+07:00`) : date;
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: WIB,
  }).format(d);
}
