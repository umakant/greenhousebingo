"use client";

import { appConfirm } from "@/lib/app-confirm";

import * as React from "react";
import {
  Database,
  Download,
  FileText,
  Info,
  Loader2,
  RefreshCw,
  Settings,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${i === 0 ? v : v.toFixed(2)} ${units[i]}`;
}

type BackupRow = {
  filename: string;
  sizeBytes: number;
  createdAt: string;
  type: "Manual" | "Auto" | "Unknown";
};

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function DatabaseBackupSection({
  canEdit,
  onFlash,
}: {
  canEdit: boolean;
  onFlash: (v: { type: "success" | "error"; message: string } | null) => void;
}) {
  const [rows, setRows] = React.useState<BackupRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [creating, setCreating] = React.useState(false);
  const [deleting, setDeleting] = React.useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [scheduleLoading, setScheduleLoading] = React.useState(false);
  const [scheduleSaving, setScheduleSaving] = React.useState(false);
  const [autoEnabled, setAutoEnabled] = React.useState(false);
  const [frequency, setFrequency] = React.useState<"daily" | "weekly" | "monthly">("daily");

  const loadList = React.useCallback(async () => {
    setLoading(true);
    onFlash(null);
    try {
      const res = await fetch("/api/settings/database-backup", { credentials: "include" });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; backups?: BackupRow[]; message?: string };
      if (!res.ok || !data?.ok) throw new Error(data?.message || "Failed to load backups");
      setRows(data.backups ?? []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load backups";
      toast.error(msg);
      onFlash({ type: "error", message: msg });
    } finally {
      setLoading(false);
    }
  }, [onFlash]);

  React.useEffect(() => {
    void loadList();
  }, [loadList]);

  const loadSchedule = React.useCallback(async () => {
    setScheduleLoading(true);
    try {
      const res = await fetch("/api/settings/database-backup/schedule", { credentials: "include" });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        enabled?: boolean;
        frequency?: string;
      };
      if (res.ok && data?.ok) {
        setAutoEnabled(!!data.enabled);
        const f = data.frequency;
        if (f === "weekly" || f === "monthly" || f === "daily") setFrequency(f);
      }
    } catch {
      // ignore
    } finally {
      setScheduleLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (sheetOpen) void loadSchedule();
  }, [sheetOpen, loadSchedule]);

  const createBackup = async () => {
    if (!canEdit) return;
    setCreating(true);
    onFlash(null);
    try {
      const res = await fetch("/api/settings/database-backup", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "manual" }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string; backups?: BackupRow[] };
      if (!res.ok || !data?.ok) throw new Error(data?.message || "Backup failed");
      if (data.backups) setRows(data.backups);
      else await loadList();
      toast.success("Database backup created.");
      onFlash({ type: "success", message: "Database backup created successfully." });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Backup failed";
      toast.error(msg);
      onFlash({ type: "error", message: msg });
    } finally {
      setCreating(false);
    }
  };

  const download = (filename: string) => {
    const enc = encodeURIComponent(filename);
    window.location.href = `/api/settings/database-backup/${enc}`;
  };

  const remove = async (filename: string) => {
    if (!canEdit) return;
    if (!(await appConfirm(`Delete backup ${filename}?`))) return;
    setDeleting(filename);
    onFlash(null);
    try {
      const enc = encodeURIComponent(filename);
      const res = await fetch(`/api/settings/database-backup/${enc}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string };
      if (!res.ok || !data?.ok) throw new Error(data?.message || "Delete failed");
      setRows((r) => r.filter((x) => x.filename !== filename));
      toast.success("Backup deleted.");
      onFlash({ type: "success", message: "Backup deleted." });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Delete failed";
      toast.error(msg);
      onFlash({ type: "error", message: msg });
    } finally {
      setDeleting(null);
    }
  };

  const saveSchedule = async () => {
    if (!canEdit) return;
    setScheduleSaving(true);
    try {
      const res = await fetch("/api/settings/database-backup/schedule", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: autoEnabled, frequency }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string };
      if (!res.ok || !data?.ok) throw new Error(data?.message || "Failed to save");
      toast.success("Auto backup settings saved.");
      onFlash({ type: "success", message: "Auto backup settings saved." });
      setSheetOpen(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to save";
      toast.error(msg);
      onFlash({ type: "error", message: msg });
    } finally {
      setScheduleSaving(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Database className="h-5 w-5" />
              Database Backup Settings
            </CardTitle>
            <CardDescription className="mt-1">
              Manage your database backups and configure automatic backup schedules.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-3 rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
            <Info className="h-5 w-5 shrink-0 text-primary mt-0.5" aria-hidden />
            <p className="leading-relaxed">
              <span className="font-medium text-foreground">Note:</span> Database backups are created using{" "}
              <code className="rounded-md border border-border bg-background px-1.5 py-0.5 text-xs font-mono text-foreground">
                pg_dump
              </code>{" "}
              when available. For very large databases, the backup process may take some time. Make sure you have
              sufficient storage space for backup files. The application server must have{" "}
              <code className="rounded-md border border-border bg-background px-1.5 py-0.5 text-xs font-mono text-foreground">
                pg_dump
              </code>{" "}
              installed and on{" "}
              <code className="rounded-md border border-border bg-background px-1.5 py-0.5 text-xs font-mono text-foreground">
                PATH
              </code>
              .
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={!canEdit || creating}
              onClick={() => void createBackup()}
            >
              {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Database className="h-4 w-4 mr-2" />}
              Create Database Backup
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-amber-500/60 text-amber-700 hover:bg-amber-500/10 dark:text-amber-400"
              onClick={() => setSheetOpen(true)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Auto Backup Settings
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-amber-500/60 text-amber-700 hover:bg-amber-500/10 dark:text-amber-400"
              disabled={loading}
              onClick={() => void loadList()}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh List
            </Button>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-3">Backup History</h3>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Filename</TableHead>
                    <TableHead>Backup Size</TableHead>
                    <TableHead>Date &amp; Time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                        Loading…
                      </TableCell>
                    </TableRow>
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                        No backups yet. Create one to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row) => (
                      <TableRow key={row.filename}>
                        <TableCell className="font-medium">
                          <span className="inline-flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="break-all">{row.filename}</span>
                          </span>
                        </TableCell>
                        <TableCell>{formatBytes(row.sizeBytes)}</TableCell>
                        <TableCell className="whitespace-nowrap">{formatDateTime(row.createdAt)}</TableCell>
                        <TableCell>{row.type}</TableCell>
                        <TableCell>
                          <Badge className="bg-emerald-600 hover:bg-emerald-600">Completed</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
                              title="Download"
                              onClick={() => download(row.filename)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              title="Delete"
                              disabled={!canEdit || deleting === row.filename}
                              onClick={() => void remove(row.filename)}
                            >
                              {deleting === row.filename ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Auto Backup Settings</SheetTitle>
            <SheetDescription>
              Preferences are stored for the application. Actual scheduled runs require a server cron job or task
              scheduler calling the backup API.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-6 py-6">
            {scheduleLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
                  <div>
                    <Label htmlFor="db-backup-auto" className="text-base">
                      Enable automatic backups
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      When enabled, your automation should trigger backups on the selected frequency.
                    </p>
                  </div>
                  <Switch
                    id="db-backup-auto"
                    checked={autoEnabled}
                    onCheckedChange={setAutoEnabled}
                    disabled={!canEdit}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Select
                    value={frequency}
                    onValueChange={(v) => setFrequency(v as typeof frequency)}
                    disabled={!canEdit}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
          <SheetFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={!canEdit || scheduleSaving || scheduleLoading} onClick={() => void saveSchedule()}>
              {scheduleSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
