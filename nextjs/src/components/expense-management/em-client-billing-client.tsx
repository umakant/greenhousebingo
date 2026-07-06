"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown, Download } from "lucide-react";

import { EmMatterWorkspaceShell } from "@/components/expense-management/em-matter-workspace-shell";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";
import { useTranslation } from "@/contexts/translation-context";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatDate } from "@/lib/format-date";
import type { EmExpenseLineRow } from "@/components/expense-management/em-expense-line-sheet";
import { cn } from "@/lib/utils";

function billableOn(v: string | null | undefined) {
  if (!v) return true;
  const s = v.trim().toLowerCase();
  return s === "yes" || s === "y" || s === "billable" || s === "true" || s === "1";
}

export function EmClientBillingClient() {
  const { t: tLang } = useTranslation();
  const t = React.useCallback((s: string) => tLang(s) || s, [tLang]);
  const { settings } = useAppSettings();
  const fmtDate = (d: string) => formatDate(d, settings);

  const [lines, setLines] = React.useState<EmExpenseLineRow[]>([]);
  const [timeRows, setTimeRows] = React.useState<
    Array<{
      id: string;
      employeeName: string;
      vendorName: string | null;
      serviceLine: string | null;
      clockInDate: string;
      durationHours: number | null;
      billable: string | null;
    }>
  >([]);
  const [totalHours, setTotalHours] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [timeOpen, setTimeOpen] = React.useState(true);
  const [expOpen, setExpOpen] = React.useState(true);
  const [actorName, setActorName] = React.useState("—");

  React.useEffect(() => {
    fetch("/api/auth/me", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((j: { name?: string; email?: string }) => {
        const n = (j?.name ?? "").trim();
        setActorName(n || (j?.email as string) || "—");
      })
      .catch(() => {});
  }, []);

  const load = React.useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/expense-management/lines", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/expense-management/time-entries", { credentials: "include" }).then((r) => r.json()),
    ])
      .then(([linesJson, timeJson]) => {
        if (linesJson.ok) setLines(linesJson.data as EmExpenseLineRow[]);
        if (timeJson.data) {
          setTimeRows(timeJson.data);
          setTotalHours(typeof timeJson.totalHours === "number" ? timeJson.totalHours : 0);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function setBillable(row: EmExpenseLineRow, on: boolean) {
    const billable = on ? "Yes" : "No";
    const res = await fetch(`/api/expense-management/lines/${row.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ billable }),
    });
    if (res.ok) void load();
  }

  const totalExpenses = React.useMemo(
    () => lines.reduce((s, r) => s + Number(r.amountUsd ?? r.amount ?? 0), 0),
    [lines],
  );

  function exportExpensesCsv() {
    const headers = ["Name", "Vendor", "Category", "Date", "Notes", "Amount", "Billable", "Status"];
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const rows = lines.map((r) => {
      const notes = [r.internalNote, r.additionalInfo].filter(Boolean).join(" ").slice(0, 500);
      return [
        esc(actorName),
        esc(r.merchant ?? ""),
        esc(r.category),
        esc(r.expenseDate),
        esc(notes),
        esc(String(r.amountUsd ?? r.amount)),
        esc(r.billable ?? ""),
        esc(r.status),
      ].join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "expense-lines.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <EmMatterWorkspaceShell active="billing" panelTitle={t("Client Billing Summary")}>
      <div className="mb-4 flex justify-end">
        <Button type="button" variant="outline" size="sm" className="gap-2" onClick={exportExpensesCsv}>
          <Download className="h-4 w-4" />
          {t("Export")}
        </Button>
      </div>

      <Collapsible open={timeOpen} onOpenChange={setTimeOpen} className="mb-4 rounded-md border">
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 bg-sky-50/80 px-4 py-3 text-left text-sm font-semibold">
          {t("Time Entries")}
          <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", timeOpen && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="overflow-x-auto border-t">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-3 py-2 font-medium">{t("Name")}</th>
                  <th className="px-3 py-2 font-medium">{t("Vendor Name")}</th>
                  <th className="px-3 py-2 font-medium">{t("Service Line")}</th>
                  <th className="px-3 py-2 font-medium">{t("Clock In Date")}</th>
                  <th className="px-3 py-2 font-medium">{t("Duration")}</th>
                  <th className="px-3 py-2 font-medium">{t("Billable")}</th>
                  <th className="px-3 py-2 font-medium">{t("Notes")}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                      {t("Loading...")}
                    </td>
                  </tr>
                ) : timeRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                      {t("No records found")}
                    </td>
                  </tr>
                ) : (
                  timeRows.map((row) => (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="px-3 py-2">{row.employeeName}</td>
                      <td className="px-3 py-2">{row.vendorName ?? "—"}</td>
                      <td className="px-3 py-2">{row.serviceLine ?? "—"}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{fmtDate(row.clockInDate)}</td>
                      <td className="px-3 py-2 tabular-nums">
                        {row.durationHours != null ? row.durationHours.toFixed(2) : "—"}
                      </td>
                      <td className="px-3 py-2">{row.billable ?? "—"}</td>
                      <td className="px-3 py-2">—</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end border-t px-4 py-2">
            <span className="text-sm text-muted-foreground">{t("Total Hours")}: </span>
            <span className="ml-2 text-sm font-bold tabular-nums">{totalHours.toFixed(2)}</span>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Collapsible open={expOpen} onOpenChange={setExpOpen} className="rounded-md border">
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 bg-sky-50/80 px-4 py-3 text-left text-sm font-semibold">
          {t("Expenses")}
          <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", expOpen && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="overflow-x-auto border-t">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-3 py-2 font-medium">{t("Name")}</th>
                  <th className="px-3 py-2 font-medium">{t("Vendor Name")}</th>
                  <th className="px-3 py-2 font-medium">{t("Category")}</th>
                  <th className="px-3 py-2 font-medium">{t("Date")}</th>
                  <th className="px-3 py-2 font-medium">{t("Notes")}</th>
                  <th className="px-3 py-2 font-medium">{t("Attachments")}</th>
                  <th className="px-3 py-2 font-medium">{t("Amount")}</th>
                  <th className="px-3 py-2 font-medium">{t("Billable")}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                      {t("Loading...")}
                    </td>
                  </tr>
                ) : lines.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                      {t("No records found")}
                    </td>
                  </tr>
                ) : (
                  lines.map((r) => {
                    const notes = [r.internalNote, r.additionalInfo].filter(Boolean).join(" ").trim();
                    const short = notes.length > 80 ? `${notes.slice(0, 80)}…` : notes || "—";
                    return (
                      <tr key={r.id} className="border-b last:border-0">
                        <td className="px-3 py-2">{actorName}</td>
                        <td className="px-3 py-2">{r.merchant ?? "—"}</td>
                        <td className="px-3 py-2">{r.category}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{fmtDate(r.expenseDate)}</td>
                        <td className="max-w-[220px] px-3 py-2 text-muted-foreground" title={notes || undefined}>
                          {short}
                        </td>
                        <td className="px-3 py-2">
                          {r.receiptAttached ? (
                            <Link href="/expense-management/receipts" className="text-primary underline-offset-2 hover:underline">
                              {t("View Documents")}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums font-medium">
                          {(r.amountUsd ?? r.amount).toLocaleString(undefined, {
                            style: "currency",
                            currency: r.currency || "USD",
                          })}
                        </td>
                        <td className="px-3 py-2">
                          <Switch
                            checked={billableOn(r.billable)}
                            onCheckedChange={(on) => void setBillable(r, on)}
                            aria-label={t("Billable")}
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end border-t px-4 py-2">
            <span className="text-sm text-muted-foreground">{t("Total Expenses")}: </span>
            <span className="ml-2 text-sm font-bold tabular-nums">
              {totalExpenses.toLocaleString(undefined, { style: "currency", currency: "USD" })}
            </span>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </EmMatterWorkspaceShell>
  );
}
