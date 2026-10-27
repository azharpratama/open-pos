export type RosterEntry = { id: string; name: string };

// Today's cashiers = employees scheduled in the Shift section for today (WIB).
export async function fetchRoster(): Promise<{
  date: string;
  entries: RosterEntry[];
}> {
  const res = await fetch("/api/cashiers", { cache: "no-store" });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error ?? "Gagal memuat daftar kasir");
  }
  return { date: json.date as string, entries: json.data as RosterEntry[] };
}
