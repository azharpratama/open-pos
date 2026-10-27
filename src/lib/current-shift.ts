export type CurrentShiftInfo = {
  date: string;
  shiftType: "SIANG" | "MALAM" | null;
  startTime: string | null;
  endTime: string | null;
  cashiers: string[];
};

export async function fetchCurrentShift(): Promise<CurrentShiftInfo> {
  const res = await fetch("/api/current-shift", { cache: "no-store" });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Gagal memuat shift");
  return json.data as CurrentShiftInfo;
}

export function shiftLabel(type: "SIANG" | "MALAM" | null): string {
  if (type === "SIANG") return "Siang";
  if (type === "MALAM") return "Malam";
  return "Tutup";
}
