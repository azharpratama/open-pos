import fs from "fs";
import path from "path";
import { Download, DatabaseZap, Terminal } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function BackupSettingsPage() {
  const backupDir = path.join(process.cwd(), "backups");
  let backupFiles: Array<{ name: string; size: string; createdAt: string }> = [];

  try {
    if (fs.existsSync(backupDir)) {
      const files = fs.readdirSync(backupDir);
      backupFiles = files
        .filter((f) => f.endsWith(".sql") || f.endsWith(".sql.gz"))
        .map((f) => {
          const stats = fs.statSync(path.join(backupDir, f));
          return {
            name: f,
            size: `${(stats.size / 1024).toFixed(1)} KB`,
            createdAt: stats.mtime.toLocaleString("id-ID"),
          };
        })
        .reverse();
    }
  } catch {
    backupFiles = [];
  }

  return (
    <div className="flex max-w-xl flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DatabaseZap className="size-5" />
            Database Backups
          </CardTitle>
          <CardDescription>
            Manajemen dan unduh file cadangan database PostgreSQL (OpenPOS).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <Terminal className="size-3.5" />
              Perintah Backup Manual via CLI
            </p>
            <p>Jalankan skrip backup di terminal server:</p>
            <code className="block rounded bg-background px-2 py-1 font-mono text-[11px] text-foreground">
              ./scripts/backup.sh
            </code>
          </div>

          {!backupFiles.length ? (
            <p className="text-sm text-muted-foreground">Belum ada file backup di direktori lokal.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {backupFiles.map((file) => (
                <div
                  key={file.name}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {file.createdAt} · {file.size}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">
                    backups/{file.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
