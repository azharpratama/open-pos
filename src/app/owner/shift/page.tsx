"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Moon,
  Sun,
} from "lucide-react";
import { toast } from "sonner";
import useSWR from "swr";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatDateLong, formatRupiah, todayWIB } from "@/lib/format";
import { fetchEmployees, type Employee } from "@/lib/employees";
import { fetchRecordedSalaryDates, recordSalary } from "@/lib/salary";
import {
  fetchSchedule,
  setSlot,
  type ShiftSlot,
} from "@/lib/shift-schedules";

const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

type Day = { date: string; inMonth: boolean; isToday: boolean };

function buildMonth(year: number, month: number): Day[] {
  const today = todayWIB();
  const first = new Date(Date.UTC(year, month, 1));
  const weekdayMon = (first.getUTCDay() + 6) % 7; // Monday = 0
  const start = new Date(first);
  start.setUTCDate(1 - weekdayMon);
  const days: Day[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    const date = d.toISOString().slice(0, 10);
    days.push({
      date,
      inMonth: d.getUTCMonth() === month,
      isToday: date === today,
    });
  }
  return days;
}

function buildSlotMap(slots: ShiftSlot[]): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const s of slots) {
    const key = `${s.workDate}:${s.shiftType}`;
    const existing = m.get(key) ?? [];
    m.set(key, [...new Set([...existing, ...s.employeeIds])]);
  }
  return m;
}

export default function ShiftPage() {
  const [year, setYear] = useState(() => Number(todayWIB().slice(0, 4)));
  const [month, setMonth] = useState(() => Number(todayWIB().slice(5, 7)) - 1);
  const days = useMemo(() => buildMonth(year, month), [year, month]);
  const startDate = days[0].date;
  const endDate = days[41].date;

  const { data: employees = [], error: empError, isLoading: empLoading } = useSWR("/api/employees", fetchEmployees);
  
  const { data: rawSlots = [], error: slotError, isLoading: slotLoading, mutate: mutateSlots } = useSWR(
    ["/api/shift-schedules", startDate, endDate],
    ([_, s, e]) => fetchSchedule(s, e)
  );

  const { data: rawRecapped = [], error: recapError, isLoading: recapLoading, mutate: mutateRecapped } = useSWR(
    ["/api/salary-records", startDate, endDate],
    ([_, s, e]) => fetchRecordedSalaryDates(s, e)
  );

  const slots = useMemo(() => buildSlotMap(rawSlots), [rawSlots]);
  const recapped = useMemo(() => new Set(rawRecapped), [rawRecapped]);

  const loading = empLoading || slotLoading || recapLoading;
  const errorObj = empError || slotError || recapError;
  const error = errorObj instanceof Error ? errorObj.message : errorObj ? "Gagal memuat" : null;

  const [dialogDate, setDialogDate] = useState<string | null>(null);
  const [siangIds, setSiangIds] = useState<string[]>([]);
  const [malamIds, setMalamIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [rekapBusy, setRekapBusy] = useState(false);

  async function loadMonth(y: number, m: number) {
    setYear(y);
    setMonth(m);
  }

  function prevMonth() {
    if (month === 0) void loadMonth(year - 1, 11);
    else void loadMonth(year, month - 1);
  }
  function nextMonth() {
    if (month === 11) void loadMonth(year + 1, 0);
    else void loadMonth(year, month + 1);
  }
  function goToday() {
    void loadMonth(
      Number(todayWIB().slice(0, 4)),
      Number(todayWIB().slice(5, 7)) - 1,
    );
  }

  const empName = (id: string) => employees.find((e) => e.id === id)?.name ?? "?";

  function openDay(date: string) {
    setDialogDate(date);
    setSiangIds(slots.get(`${date}:SIANG`) ?? []);
    setMalamIds(slots.get(`${date}:MALAM`) ?? []);
  }

  function toggle(
    list: string[],
    setList: (v: string[]) => void,
    id: string,
  ) {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  const dialogRecapped = dialogDate !== null && recapped.has(dialogDate);

  const dialogSalary = useMemo(() => {
    const distinct = new Set([...siangIds, ...malamIds]);
    let sum = 0;
    for (const id of distinct) {
      sum += employees.find((e) => e.id === id)?.dailyWage ?? 0;
    }
    return sum;
  }, [siangIds, malamIds, employees]);

  async function saveSlots(): Promise<boolean> {
    if (!dialogDate) return false;
    try {
      await Promise.all([
        setSlot(dialogDate, "SIANG", siangIds),
        setSlot(dialogDate, "MALAM", malamIds),
      ]);
      mutateSlots((prev) => {
        const p = prev ?? [];
        return [
          ...p.filter((s) => s.workDate !== dialogDate),
          { workDate: dialogDate, shiftType: "SIANG", employeeIds: siangIds },
          { workDate: dialogDate, shiftType: "MALAM", employeeIds: malamIds },
        ];
      }, false);
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan");
      return false;
    }
  }

  async function handleSaveOnly() {
    if (saving || rekapBusy) return;
    setSaving(true);
    const ok = await saveSlots();
    setSaving(false);
    if (ok) {
      toast.success("Jadwal disimpan");
      setDialogDate(null);
    }
  }

  async function handleSaveRekap() {
    if (!dialogDate || saving || rekapBusy) return;
    setRekapBusy(true);
    const ok = await saveSlots();
    if (ok) {
      try {
        const res = await recordSalary(dialogDate);
        mutateRecapped((prev) => [...(prev ?? []), dialogDate], false);
        toast.success(
          `Jadwal disimpan · gaji ${formatRupiah(res.total)} direkap ke pembelian`,
        );
        setDialogDate(null);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Gagal merekap gaji");
      }
    }
    setRekapBusy(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={prevMonth}
            aria-label="Bulan sebelumnya"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-36 text-center font-semibold">
            {MONTHS[month]} {year}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={nextMonth}
            aria-label="Bulan berikutnya"
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={goToday}>
            Hari ini
          </Button>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Sun className="size-3.5" /> Siang 09:00–17:00
          </span>
          <span className="flex items-center gap-1">
            <Moon className="size-3.5" /> Malam 17:00–02:00
          </span>
        </div>
      </div>

      {error ? (
        <Card className="py-12 text-center text-sm text-destructive">{error}</Card>
      ) : (
        <Card className="p-2 sm:p-3">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Memuat...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[720px]">
                <div className="grid grid-cols-7">
                  {WEEKDAYS.map((w) => (
                    <div
                      key={w}
                      className="px-2 py-1.5 text-center text-xs font-medium text-muted-foreground"
                    >
                      {w}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {days.map((day) => {
                    const siang = slots.get(`${day.date}:SIANG`) ?? [];
                    const malam = slots.get(`${day.date}:MALAM`) ?? [];
                    // Saved shifts whose salary hasn't been recapped yet show
                    // amber; once recapped they turn green.
                    const isRecapped = recapped.has(day.date);
                    return (
                      <button
                        key={day.date}
                        type="button"
                        onClick={() => openDay(day.date)}
                        className={cn(
                          "flex min-h-24 flex-col gap-1 rounded-lg border p-1.5 text-left transition-colors hover:border-primary",
                          day.inMonth ? "bg-card" : "bg-muted/30 opacity-60",
                          day.isToday && "border-primary ring-1 ring-primary",
                        )}
                      >
                        <span
                          className={cn(
                            "text-xs font-semibold",
                            day.isToday && "text-primary",
                          )}
                        >
                          {Number(day.date.slice(8, 10))}
                        </span>
                        <ShiftChip
                          label="S"
                          names={siang.map(empName)}
                          recapped={isRecapped}
                        />
                        <ShiftChip
                          label="M"
                          names={malam.map(empName)}
                          recapped={isRecapped}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      <Dialog
        open={dialogDate !== null}
        onOpenChange={(o) => {
          if (!o) setDialogDate(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Shift · {dialogDate ? formatDateLong(dialogDate) : ""}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <ShiftAssign
              label="Siang (09:00–17:00)"
              icon={<Sun className="size-4" />}
              employees={employees}
              selected={siangIds}
              onToggle={(id) => toggle(siangIds, setSiangIds, id)}
            />
            <ShiftAssign
              label="Malam (17:00–02:00)"
              icon={<Moon className="size-4" />}
              employees={employees}
              selected={malamIds}
              onToggle={(id) => toggle(malamIds, setMalamIds, id)}
            />
            <div className="flex items-center justify-between rounded-lg bg-muted p-3 text-sm">
              <span className="text-muted-foreground">Estimasi gaji hari ini</span>
              <span className="font-semibold tabular-nums">
                {formatRupiah(dialogSalary)}
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={saving || rekapBusy || dialogRecapped}
              onClick={handleSaveRekap}
            >
              {rekapBusy && <Loader2 className="size-4 animate-spin" />}
              {dialogRecapped ? "Gaji Sudah Direkap" : "Simpan & Rekap Gaji"}
            </Button>
            <Button
              type="button"
              disabled={saving || rekapBusy}
              onClick={handleSaveOnly}
            >
              {saving && !rekapBusy && <Loader2 className="size-4 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ShiftChip({
  label,
  names,
  recapped,
}: {
  label: string;
  names: string[];
  recapped: boolean;
}) {
  const empty = names.length === 0;
  return (
    <div
      className={cn(
        "truncate rounded px-1.5 py-0.5 text-[11px]",
        empty
          ? "bg-destructive/10 text-destructive"
          : recapped
            ? "bg-success-subtle text-success-foreground border-success-border"
            : "bg-warning-subtle text-warning-foreground border-warning-border",
      )}
    >
      <span className="font-semibold">{label}</span>{" "}
      {empty
        ? "Kosong"
        : names.length <= 2
          ? names.join(", ")
          : `${names[0]} +${names.length - 1}`}
    </div>
  );
}

function ShiftAssign({
  label,
  icon,
  employees,
  selected,
  onToggle,
}: {
  label: string;
  icon: ReactNode;
  employees: Employee[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5 text-sm font-medium">
        {icon}
        {label}
      </div>
      {employees.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Belum ada karyawan. Tambahkan dulu di section Karyawan.
        </p>
      ) : (
        <div className="flex max-h-32 flex-col gap-0.5 overflow-y-auto rounded-md border p-1.5">
          {employees.map((e) => (
            <label
              key={e.id}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted"
            >
              <input
                type="checkbox"
                checked={selected.includes(e.id)}
                onChange={() => onToggle(e.id)}
                className="size-4 accent-primary"
              />
              {e.name}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
