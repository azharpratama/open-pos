import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from "vitest";

/**
 * Tests for src/lib/format.ts
 * All functions are pure (no side effects) except todayWIB / wibHour / operationalDateWIB
 * which read the system clock — those are tested with vi.setSystemTime().
 */

import {
  formatRupiah,
  formatDateTime,
  formatTime,
  formatDateShort,
  formatDateLong,
  addDays,
  startOfMonthWIB,
  startOfWeekWIB,
  todayWIB,
  wibHour,
  operationalDateWIB,
  currentShift,
} from "@/lib/format";

// ---------- formatRupiah ----------

describe("formatRupiah", () => {
  it("formats zero", () => {
    expect(formatRupiah(0)).toBe("Rp\u00a00");
  });
  it("formats thousands", () => {
    expect(formatRupiah(15000)).toMatch(/15\.000/);
  });
  it("formats hundreds of thousands", () => {
    expect(formatRupiah(250000)).toMatch(/250\.000/);
  });
  it("formats millions", () => {
    expect(formatRupiah(1500000)).toMatch(/1\.500\.000/);
  });
  it("formats negative (discount shown as negative should still render)", () => {
    const result = formatRupiah(-5000);
    expect(result).toMatch(/5\.000/);
  });
});

// ---------- addDays ----------

describe("addDays", () => {
  it("adds days correctly", () => {
    expect(addDays("2026-07-15", 1)).toBe("2026-07-16");
  });
  it("subtracts days with negative input", () => {
    expect(addDays("2026-07-15", -1)).toBe("2026-07-14");
  });
  it("wraps month boundary correctly", () => {
    expect(addDays("2026-07-31", 1)).toBe("2026-08-01");
  });
  it("wraps year boundary correctly", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
  it("zero delta returns same date", () => {
    expect(addDays("2026-07-15", 0)).toBe("2026-07-15");
  });
  it("handles large delta", () => {
    expect(addDays("2026-01-01", 365)).toBe("2027-01-01");
  });
});

// ---------- formatDateShort ----------

describe("formatDateShort", () => {
  it("formats YYYY-MM-DD to DD/MM/YYYY", () => {
    expect(formatDateShort("2026-07-15")).toBe("15/07/2026");
  });
  it("single-digit day and month are kept as-is", () => {
    expect(formatDateShort("2026-01-05")).toBe("05/01/2026");
  });
});

// ---------- Clock-dependent functions (pinned via vi.setSystemTime) ----------

describe("todayWIB", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("returns WIB date for a UTC timestamp that is still yesterday in WIB", () => {
    // 2026-07-15 UTC 17:00 = 2026-07-16 00:00 WIB → WIB date is July 16
    vi.setSystemTime(new Date("2026-07-15T17:00:00Z"));
    expect(todayWIB()).toBe("2026-07-16");
  });

  it("returns WIB date for a UTC noon timestamp (same day both zones)", () => {
    // 2026-07-15 UTC 05:00 = 2026-07-15 12:00 WIB → WIB date is July 15
    vi.setSystemTime(new Date("2026-07-15T05:00:00Z"));
    expect(todayWIB()).toBe("2026-07-15");
  });
});

describe("wibHour", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("returns 0 at WIB midnight (UTC 17:00 previous day)", () => {
    vi.setSystemTime(new Date("2026-07-15T17:00:00Z")); // midnight WIB
    expect(wibHour()).toBe(0);
  });

  it("returns 12 at WIB noon (UTC 05:00)", () => {
    vi.setSystemTime(new Date("2026-07-15T05:00:00Z")); // noon WIB
    expect(wibHour()).toBe(12);
  });

  it("returns 23 at WIB 23:00 (UTC 16:00)", () => {
    vi.setSystemTime(new Date("2026-07-15T16:00:00Z")); // 23:00 WIB
    expect(wibHour()).toBe(23);
  });
});

describe("operationalDateWIB", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("treats 00:00–01:59 WIB as the previous operational day", () => {
    // 01:00 WIB on July 16 → operational date is July 15
    vi.setSystemTime(new Date("2026-07-15T18:00:00Z")); // 01:00 WIB
    expect(operationalDateWIB()).toBe("2026-07-15");
  });

  it("treats 02:00 WIB as the start of the new operational day", () => {
    // 02:00 WIB on July 16 → operational date is July 16
    vi.setSystemTime(new Date("2026-07-15T19:00:00Z")); // 02:00 WIB
    expect(operationalDateWIB()).toBe("2026-07-16");
  });

  it("treats normal daytime (12:00 WIB) as the current day", () => {
    vi.setSystemTime(new Date("2026-07-15T05:00:00Z")); // 12:00 WIB
    expect(operationalDateWIB()).toBe("2026-07-15");
  });
});

describe("currentShift", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("returns SIANG during 09:00–16:59 WIB", () => {
    vi.setSystemTime(new Date("2026-07-15T04:00:00Z")); // 11:00 WIB
    const shift = currentShift();
    expect(shift?.type).toBe("SIANG");
    expect(shift?.start).toBe("09:00");
    expect(shift?.end).toBe("17:00");
  });

  it("returns MALAM during 17:00–23:59 WIB", () => {
    vi.setSystemTime(new Date("2026-07-15T12:00:00Z")); // 19:00 WIB
    const shift = currentShift();
    expect(shift?.type).toBe("MALAM");
    expect(shift?.start).toBe("17:00");
    expect(shift?.end).toBe("02:00");
  });

  it("returns MALAM for 00:00–01:59 WIB (late night still counts as previous shift)", () => {
    vi.setSystemTime(new Date("2026-07-15T17:30:00Z")); // 00:30 WIB
    const shift = currentShift();
    expect(shift?.type).toBe("MALAM");
  });

  it("returns null during 02:00–08:59 WIB (cafe closed)", () => {
    vi.setSystemTime(new Date("2026-07-15T19:30:00Z")); // 02:30 WIB
    expect(currentShift()).toBeNull();
  });
});

describe("startOfMonthWIB", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("returns the first of the current WIB month", () => {
    vi.setSystemTime(new Date("2026-07-15T05:00:00Z")); // July 15 WIB
    expect(startOfMonthWIB()).toBe("2026-07-01");
  });

  it("handles late-night UTC where WIB is next month", () => {
    // 2026-07-31 UTC 17:00 = 2026-08-01 WIB → first of August
    vi.setSystemTime(new Date("2026-07-31T17:00:00Z"));
    expect(startOfMonthWIB()).toBe("2026-08-01");
  });
});

describe("startOfWeekWIB", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("returns Monday for a Wednesday", () => {
    // July 15, 2026 is a Wednesday
    vi.setSystemTime(new Date("2026-07-15T05:00:00Z"));
    expect(startOfWeekWIB()).toBe("2026-07-13"); // Monday
  });

  it("returns the same day for a Monday", () => {
    // July 13, 2026 is a Monday
    vi.setSystemTime(new Date("2026-07-13T05:00:00Z"));
    expect(startOfWeekWIB()).toBe("2026-07-13");
  });

  it("returns the most recent Monday for a Sunday", () => {
    // July 19, 2026 is a Sunday
    vi.setSystemTime(new Date("2026-07-19T05:00:00Z"));
    expect(startOfWeekWIB()).toBe("2026-07-13"); // Monday of same week
  });
});

// ---------- formatDateTime / formatTime (smoke tests — exact output is locale-dependent) ----------

describe("formatDateTime", () => {
  it("returns a non-empty string for a valid ISO timestamp", () => {
    const result = formatDateTime("2026-07-15T05:00:00Z");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("formatTime", () => {
  it("returns a non-empty string", () => {
    const result = formatTime("2026-07-15T05:00:00Z");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("formatDateLong", () => {
  it("returns a non-empty Indonesian date string", () => {
    const result = formatDateLong("2026-07-15");
    expect(typeof result).toBe("string");
    expect(result).toMatch(/2026/); // year is always present
  });
});
