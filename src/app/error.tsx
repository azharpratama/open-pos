"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Uncaught error:", error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="size-8 text-destructive" />
      </div>
      <div className="flex max-w-md flex-col gap-2">
        <h2 className="text-xl font-bold">Terjadi Kesalahan</h2>
        <p className="text-sm text-muted-foreground">
          {error.message || "Halaman mengalami error. Coba muat ulang."}
        </p>
        {error.digest && (
          <p className="font-mono text-xs text-muted-foreground/60">
            Kode: {error.digest}
          </p>
        )}
      </div>
      <Button onClick={reset} variant="outline" size="lg">
        <RefreshCw className="size-4" />
        Coba Lagi
      </Button>
    </div>
  );
}
