"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import { EmMatterWorkspaceShell } from "@/components/expense-management/em-matter-workspace-shell";
import { useTranslation } from "@/contexts/translation-context";
import { useAppSettingsOptional } from "@/contexts/app-settings-context";
import { formatDate as fmtDateLib } from "@/lib/format-date";

type TimeEntryRow = {
  id: string;
  employeeName: string;
  vendorName: string | null;
  serviceLine: string | null;
  clockInDate: string;
  clockInTime: string | null;
  clockOutTime: string | null;
  durationHours: number | null;
  billable: string | null;
};

export function EmTimeSheetsClient() {
  const { t: tLang } = useTranslation();
  const t = React.useCallback((s: string) => tLang(s) || s, [tLang]);
  const appSettings = useAppSettingsOptional();
  const settings = appSettings?.settings ?? {};

  const [rows, setRows] = React.useState<TimeEntryRow[]>([]);
  const [totalHours, setTotalHours] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/expense-management/time-entries", {
          cache: "no-store",
          credentials: "include",
        });
        const json = (await res.json().catch(() => null)) as {
          data?: TimeEntryRow[];
          totalHours?: number;
          error?: string;
        } | null;
        if (!res.ok) throw new Error(json?.error || t("Failed to load time sheets."));
        if (!cancelled) {
          setRows(json?.data ?? []);
          setTotalHours(typeof json?.totalHours === "number" ? json.totalHours : 0);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setRows([]);
          setTotalHours(0);
          setError(e instanceof Error ? e.message : t("Failed to load time sheets."));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const fmt = (d: string) => fmtDateLib(d, settings);

  return (
    <EmMatterWorkspaceShell active="timesheets" panelTitle={t("Time Sheets")}>
      {error ? (
        <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b bg-sky-50/80 text-left">
              <th className="px-3 py-2 font-medium">{t("Name")}</th>
              <th className="px-3 py-2 font-medium">{t("Vendor Name")}</th>
              <th className="px-3 py-2 font-medium">{t("Service Line")}</th>
              <th className="px-3 py-2 font-medium">{t("Clock In Date")}</th>
              <th className="px-3 py-2 font-medium">{t("Clock In")}</th>
              <th className="px-3 py-2 font-medium">{t("Clock Out")}</th>
              <th className="px-3 py-2 font-medium">{t("Duration")}</th>
              <th className="px-3 py-2 font-medium">{t("Billable")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-3 py-10 text-center text-muted-foreground">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-10 text-center text-muted-foreground">
                  {t("No records found")}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-3 py-2 font-medium">{row.employeeName}</td>
                  <td className="px-3 py-2">{row.vendorName ?? "—"}</td>
                  <td className="px-3 py-2">{row.serviceLine ?? "—"}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{fmt(row.clockInDate)}</td>
                  <td className="px-3 py-2">{row.clockInTime ?? "—"}</td>
                  <td className="px-3 py-2">{row.clockOutTime ?? "—"}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {row.durationHours != null ? row.durationHours.toFixed(2) : "—"}
                  </td>
                  <td className="px-3 py-2">{row.billable ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex justify-end border-t pt-3">
        <div className="rounded-md border bg-muted/30 px-4 py-2 text-right">
          <span className="text-xs text-muted-foreground">{t("Total Hours")}</span>
          <p className="text-lg font-semibold tabular-nums">{totalHours.toFixed(2)}</p>
        </div>
      </div>
    </EmMatterWorkspaceShell>
  );
}
