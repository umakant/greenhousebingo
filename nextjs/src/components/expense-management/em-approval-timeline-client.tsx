"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import { EmMatterWorkspaceShell } from "@/components/expense-management/em-matter-workspace-shell";
import { EmLineStatusBadge } from "@/components/expense-management/em-expense-status-badges";
import { useTranslation } from "@/contexts/translation-context";
import { useAppSettingsOptional } from "@/contexts/app-settings-context";
import { formatDateTime as fmtDateTimeLib } from "@/lib/format-date";

type TimelineItem = {
  id: string;
  label: string;
  status: string;
  when: string;
  detail?: string;
};

export function EmApprovalTimelineClient() {
  const { t: tLang } = useTranslation();
  const t = React.useCallback((s: string) => tLang(s) || s, [tLang]);
  const appSettings = useAppSettingsOptional();
  const settings = appSettings?.settings ?? {};

  const [items, setItems] = React.useState<TimelineItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const linesRes = await fetch("/api/expense-management/lines", {
          credentials: "include",
          cache: "no-store",
        });
        const reportsRes = await fetch("/api/expense-management/reports", {
          credentials: "include",
          cache: "no-store",
        });
        const linesJson = (await linesRes.json().catch(() => null)) as {
          ok?: boolean;
          data?: Array<{
            id: string;
            category: string;
            status: string;
            expenseDate: string;
            amount: number;
            merchant?: string | null;
          }>;
        } | null;
        const reportsJson = reportsRes.ok
          ? ((await reportsRes.json().catch(() => null)) as {
              ok?: boolean;
              data?: Array<{
                id: string;
                reportNumber: string;
                status: string;
                createdAt?: string;
              }>;
            } | null)
          : null;

        if (!linesRes.ok || !linesJson?.ok) throw new Error(t("Failed to load expense activity."));

        const timeline: TimelineItem[] = [];

        for (const r of reportsJson?.data ?? []) {
          timeline.push({
            id: `report-${r.id}`,
            label: t("Expense report"),
            status: r.status,
            when: r.createdAt ?? new Date().toISOString(),
            detail: r.reportNumber,
          });
        }

        for (const line of linesJson.data ?? []) {
          timeline.push({
            id: `line-${line.id}`,
            label: line.category,
            status: line.status,
            when: `${line.expenseDate}T12:00:00.000Z`,
            detail: line.merchant
              ? `${line.merchant} · $${Number(line.amount).toFixed(2)}`
              : `$${Number(line.amount).toFixed(2)}`,
          });
        }

        timeline.sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime());

        if (!cancelled) setItems(timeline);
      } catch (e: unknown) {
        if (!cancelled) {
          setItems([]);
          setError(e instanceof Error ? e.message : t("Failed to load timeline."));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  return (
    <EmMatterWorkspaceShell active="timeline" panelTitle={t("Approval Timeline")}>
      {error ? (
        <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("Loading...")}
        </div>
      ) : items.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{t("No approval activity yet.")}</p>
      ) : (
        <ol className="relative border-l border-muted-foreground/30 pl-6 space-y-6">
          {items.map((item) => (
            <li key={item.id} className="relative">
              <span className="absolute -left-[1.35rem] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary" />
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium">{item.label}</p>
                <EmLineStatusBadge status={item.status} />
              </div>
              {item.detail ? <p className="mt-0.5 text-sm text-muted-foreground">{item.detail}</p> : null}
              <p className="mt-1 text-xs text-muted-foreground">{fmtDateTimeLib(item.when, settings)}</p>
            </li>
          ))}
        </ol>
      )}
    </EmMatterWorkspaceShell>
  );
}
