"use client";

import { useEffect, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { getOfflineQueue } from "@/lib/offline-queue";
import { cn } from "@/lib/utils";

export function NetworkStatus({ collapsed }: { collapsed?: boolean }) {
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof window !== "undefined") return navigator.onLine;
    return true;
  });
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const checkQueue = async () => {
      try {
        const queue = await getOfflineQueue();
        setQueueCount(queue.length);
      } catch {
        // ignore
      }
    };
    checkQueue();
    const interval = setInterval(checkQueue, 2000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, []);

  const title = isOnline
    ? `Online${queueCount > 0 ? ` (${queueCount} antrian sync)` : ""}`
    : `Offline${queueCount > 0 ? ` (${queueCount} pesanan tertunda)` : ""}`;

  return (
    <button
      type="button"
      onClick={() => {
        toast.info(isOnline ? "Status Jaringan: Online" : "Status Jaringan: Offline", {
          description: queueCount > 0
            ? `${queueCount} pesanan dalam antrian sinkronisasi offline.`
            : isOnline
              ? "Koneksi stabil dan terhubung ke server."
              : "Perangkat sedang offline. Pesanan akan disimpan lokal.",
        });
      }}
      className={cn(
        "relative flex items-center h-10 rounded-xl text-sm font-medium transition-colors overflow-hidden border p-0",
        collapsed ? "w-10 justify-center mx-auto" : "w-full",
        isOnline
          ? "bg-success-subtle text-success-foreground border-success-border hover:bg-success-border/50"
          : "bg-danger-subtle text-destructive border-danger-border hover:bg-destructive/20"
      )}
      title={title}
      aria-label={title}
    >
      <div className={cn("flex size-10 shrink-0 items-center justify-center", !collapsed && "-ml-px")}>
        {isOnline ? <Wifi className="size-5 shrink-0" /> : <WifiOff className="size-5 shrink-0" />}
      </div>
      {!collapsed && (
        <div className="flex items-center justify-between flex-1 min-w-0 pr-3">
          <span className="truncate">{isOnline ? "Online" : "Offline"}</span>
          {queueCount > 0 && (
            <span className="shrink-0 text-[11px] font-normal opacity-80">({queueCount} sync)</span>
          )}
        </div>
      )}
    </button>
  );
}
