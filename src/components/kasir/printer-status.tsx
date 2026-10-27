// components/printer-status.tsx
"use client"

import { useState, useEffect } from "react"
import { Bluetooth, BluetoothOff, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { manualConnect, forgetPrinter, onPrinterStatus, getPrinterName } from "@/lib/printer"
import { cn } from "@/lib/utils"

export default function PrinterStatus({ collapsed }: { collapsed?: boolean }) {
  const [connected, setConnected] = useState(false)
  const [printerName, setPrinterName] = useState<string | null>(() => {
    if (typeof window !== "undefined") return getPrinterName();
    return null;
  });
  const [connecting, setConnecting] = useState(false)

  useEffect(() => {
    // Subscribe ke perubahan status printer
    const unsubscribe = onPrinterStatus((isConnected, name) => {
      setConnected(isConnected)
      if (name) setPrinterName(name)
    })

    return () => { unsubscribe() }
  }, [])

  const handleConnect = async () => {
    setConnecting(true)
    try {
      const success = await manualConnect()
      if (!success) toast.error("Gagal terhubung ke printer bluetooth")
    } catch (err: unknown) {
      toast.error((err as Error)?.message || "Gagal terhubung ke printer")
    }
    setConnecting(false)
  }

  const handleForget = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    forgetPrinter()
    setPrinterName(null)
    setConnected(false)
  }

  const handleClick = () => {
    if (connecting) return;
    if (connected) {
      toast.success(`Printer Terhubung: ${printerName || "Bluetooth Printer"}`, {
        action: {
          label: "Putuskan",
          onClick: () => handleForget(),
        },
      });
    } else {
      handleConnect();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={connecting}
      className={cn(
        "relative flex items-center h-10 rounded-xl text-sm font-medium transition-colors overflow-hidden border p-0",
        collapsed ? "w-10 justify-center mx-auto" : "w-full",
        connecting
          ? "bg-muted/40 border-sidebar-border text-muted-foreground"
          : connected
            ? "bg-info-subtle border-info-border text-info-foreground hover:bg-info-border/50"
            : "hover:bg-sidebar-accent/50 text-muted-foreground hover:text-foreground border-dashed border-sidebar-border hover:border-sidebar-accent-foreground/30"
      )}
      title={connecting ? "Menghubungkan..." : connected ? `Terhubung: ${printerName || "Printer"}` : "Hubungkan Printer Bluetooth"}
    >
      {connected && !collapsed && (
        <span className="absolute right-2 top-2 size-2 rounded-full bg-info z-10 pointer-events-none" />
      )}
      <div className={cn("flex size-10 shrink-0 items-center justify-center", !collapsed && "-ml-px")}>
        {connecting ? (
          <Loader2 className="size-5 shrink-0 animate-spin" />
        ) : connected ? (
          <Bluetooth className="size-5 shrink-0" />
        ) : (
          <BluetoothOff className="size-5 shrink-0" />
        )}
      </div>
      {!collapsed && (
        <div className="flex items-center justify-between flex-1 min-w-0 pr-3">
          <span className="truncate">
            {connecting
              ? "Menghubungkan..."
              : connected
                ? printerName || "Printer"
                : printerName
                  ? `Hubungkan ${printerName}`
                  : "Hubungkan Printer"}
          </span>
          {connected && (
            <span
              onClick={(e) => handleForget(e)}
              className="ml-auto shrink-0 text-muted-foreground hover:text-destructive transition-colors px-1 text-sm font-bold"
              title="Putuskan printer"
            >
              ×
            </span>
          )}
        </div>
      )}
    </button>
  );
}