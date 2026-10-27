"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

// Live WIB clock initialized synchronously with real Date and suppressHydrationWarning
// to prevent any placeholder flash or hydration warnings on page load.
export function WibClock() {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formattedDate = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(now);

  const formattedTime = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(now);

  return (
    <div className="flex h-9 shrink-0 items-center justify-center gap-2 rounded-full bg-muted/80 px-3.5 text-xs sm:text-sm font-medium">
      <Clock className="size-4 text-muted-foreground shrink-0" />
      <span
        suppressHydrationWarning
        className="hidden text-muted-foreground lg:inline whitespace-nowrap"
      >
        {formattedDate}
      </span>
      <span
        suppressHydrationWarning
        className="font-medium tabular-nums whitespace-nowrap"
      >
        {formattedTime} WIB
      </span>
    </div>
  );
}
