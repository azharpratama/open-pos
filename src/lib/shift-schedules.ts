export type ShiftType = "SIANG" | "MALAM";

export type ShiftSlot = {
  workDate: string;
  shiftType: ShiftType;
  employeeIds: string[];
};

// The two fixed operational shifts. MALAM crosses midnight (ends 02:00 next day)
// but is counted on its start date.
export const SHIFTS: {
  type: ShiftType;
  label: string;
  start: string;
  end: string;
}[] = [
  { type: "SIANG", label: "Siang", start: "09:00", end: "17:00" },
  { type: "MALAM", label: "Malam", start: "17:00", end: "02:00" },
];

export async function fetchSchedule(
  from: string,
  to: string,
): Promise<ShiftSlot[]> {
  const res = await fetch(
    `/api/shift-schedules?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    { cache: "no-store" },
  );
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Gagal memuat jadwal");
  return json.data as ShiftSlot[];
}

export async function setSlot(
  workDate: string,
  shiftType: ShiftType,
  employeeIds: string[],
): Promise<ShiftSlot> {
  const res = await fetch("/api/shift-schedules", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workDate, shiftType, employeeIds }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Gagal menyimpan jadwal");
  return json.data as ShiftSlot;
}
