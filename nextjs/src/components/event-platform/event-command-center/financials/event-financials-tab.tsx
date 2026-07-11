"use client";

import * as React from "react";
import { Download, Loader2, Lock, Plus, Unlock } from "lucide-react";
import { toast } from "sonner";

import {
  BreakEvenPanel,
  FinancialAnalyticsCharts,
  FinancialSummaryCards,
  ForecastPanel,
} from "@/components/event-platform/event-command-center/financials/financial-panels";
import {
  ExpenseFormDialog,
  RevenueFormDialog,
} from "@/components/event-platform/event-command-center/financials/financial-form-dialogs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableActionButton } from "@/components/ui/table-action-button";
import type { EventFinancialsOverview } from "@/lib/event-platform/event-financials/event-financials-types";

function bucketBadge(bucket: string) {
  if (bucket === "actual") return "secondary";
  if (bucket === "pending") return "outline";
  return "default";
}

export function EventFinancialsTab(props: { eventId: string }) {
  const [overview, setOverview] = React.useState<EventFinancialsOverview | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [expenseOpen, setExpenseOpen] = React.useState(false);
  const [revenueOpen, setRevenueOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/event-platform/events/${encodeURIComponent(props.eventId)}/financials`, {
      credentials: "include",
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as {
      ok?: boolean;
      overview?: EventFinancialsOverview;
      message?: string;
    };
    if (!res.ok || !data?.ok || !data.overview) {
      toast.error(data?.message ?? "Could not load financials.");
      setOverview(null);
    } else {
      setOverview(data.overview);
    }
    setLoading(false);
  }, [props.eventId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const canManage = overview?.canManageFinancials ?? false;
  const locked = overview?.lock.locked ?? false;
  const currency = overview?.summary.currency ?? "USD";

  async function runAction(body: Record<string, unknown>) {
    const res = await fetch(
      `/api/event-platform/events/${encodeURIComponent(props.eventId)}/financials/actions`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string };
    if (!res.ok || !data?.ok) {
      toast.error(data?.message ?? "Action failed.");
      return;
    }
    toast.success("Done.");
    void load();
  }

  function exportPnl() {
    window.open(`/api/event-platform/events/${encodeURIComponent(props.eventId)}/financials/export`, "_blank");
  }

  if (loading && !overview) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading financials…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {locked ? (
            <Badge variant="secondary" className="gap-1">
              <Lock className="h-3 w-3" />
              Financials locked
            </Badge>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Actual, pending, and projected amounts are shown separately in summary cards.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={exportPnl}>
            <Download className="mr-1.5 h-4 w-4" />
            Export P&amp;L
          </Button>
          {canManage ? (
            <>
              <Button type="button" size="sm" variant="outline" disabled={locked} onClick={() => setRevenueOpen(true)}>
                Add revenue
              </Button>
              <Button type="button" size="sm" disabled={locked} onClick={() => setExpenseOpen(true)}>
                <Plus className="mr-1.5 h-4 w-4" />
                Add expense
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void runAction({ action: locked ? "unlock" : "lock" })}
              >
                {locked ? (
                  <>
                    <Unlock className="mr-1.5 h-4 w-4" />
                    Unlock
                  </>
                ) : (
                  <>
                    <Lock className="mr-1.5 h-4 w-4" />
                    Lock
                  </>
                )}
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <FinancialSummaryCards summary={overview?.summary ?? null} loading={loading} />

      <div className="grid gap-4 lg:grid-cols-2">
        {overview ? <BreakEvenPanel breakEven={overview.breakEven} currency={currency} /> : null}
        {overview ? <ForecastPanel forecast={overview.forecast} currency={currency} /> : null}
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Financial records</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="hidden md:table-cell">Payee</TableHead>
                <TableHead className="hidden lg:table-cell">Description</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden xl:table-cell">Source</TableHead>
                <TableHead className="hidden xl:table-cell">Bucket</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(overview?.lines ?? []).map((line) => (
                <TableRow key={line.id}>
                  <TableCell className="capitalize">{line.recordType}</TableCell>
                  <TableCell>{line.categoryLabel}</TableCell>
                  <TableCell className="hidden md:table-cell">{line.payeeName ?? "—"}</TableCell>
                  <TableCell className="hidden max-w-[200px] truncate lg:table-cell">{line.description ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">${line.total.toFixed(2)}</TableCell>
                  <TableCell className="capitalize text-xs">{line.paymentStatus}</TableCell>
                  <TableCell className="hidden xl:table-cell text-xs">{line.sourceLabel}</TableCell>
                  <TableCell className="hidden xl:table-cell">
                    <Badge variant={bucketBadge(line.bucket)} className="text-[10px] capitalize">
                      {line.bucket}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {line.editable && canManage && !locked ? (
                      <TableActionButton
                        label="Actions"
                        items={[
                          ...(line.linkedExpenseId
                            ? [
                                {
                                  label: "Approve",
                                  onSelect: () =>
                                    void runAction({ action: "approve_expense", expenseId: line.linkedExpenseId }),
                                },
                                {
                                  label: "Mark paid",
                                  onSelect: () =>
                                    void runAction({ action: "mark_paid", expenseId: line.linkedExpenseId }),
                                },
                              ]
                            : []),
                          { label: "View transaction", onSelect: () => toast.info(line.sourceLabel) },
                        ]}
                      />
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <FinancialAnalyticsCharts analytics={overview?.analytics ?? null} />

      {canManage ? (
        <>
          <ExpenseFormDialog open={expenseOpen} onOpenChange={setExpenseOpen} eventId={props.eventId} onSaved={load} />
          <RevenueFormDialog open={revenueOpen} onOpenChange={setRevenueOpen} eventId={props.eventId} onSaved={load} />
        </>
      ) : null}
    </div>
  );
}
