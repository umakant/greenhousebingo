"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ListFilter,
  Loader2,
  Lock,
  Plus,
  Unlock,
} from "lucide-react";
import { toast } from "sonner";

import {
  BreakEvenPanel,
  FinancialSummaryCards,
  ForecastPanel,
  RevenueExpensesChart,
} from "@/components/event-platform/event-command-center/financials/financial-panels";
import {
  ExpenseFormDialog,
  RevenueFormDialog,
} from "@/components/event-platform/event-command-center/financials/financial-form-dialogs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { cn } from "@/lib/utils";

const PAGE_SIZE = 8;

function bucketBadge(bucket: string) {
  if (bucket === "actual") return "secondary";
  if (bucket === "pending") return "outline";
  return "default";
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function statusClass(status: string) {
  const s = status.toLowerCase();
  if (s === "completed" || s === "paid") return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
  if (s === "pending" || s === "approved") return "bg-amber-500/15 text-amber-700 dark:text-amber-400";
  if (s === "failed" || s === "cancelled" || s === "refunded") return "bg-red-500/15 text-red-700 dark:text-red-400";
  return "bg-muted text-muted-foreground";
}

export function EventFinancialsTab(props: { eventId: string }) {
  const [overview, setOverview] = React.useState<EventFinancialsOverview | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [expenseOpen, setExpenseOpen] = React.useState(false);
  const [revenueOpen, setRevenueOpen] = React.useState(false);

  const [typeFilter, setTypeFilter] = React.useState("all");
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [page, setPage] = React.useState(1);

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
  const lines = overview?.lines ?? [];

  const categories = React.useMemo(() => {
    const set = new Set<string>();
    for (const l of lines) set.add(l.categoryLabel);
    return [...set].sort();
  }, [lines]);

  const statuses = React.useMemo(() => {
    const set = new Set<string>();
    for (const l of lines) set.add(l.paymentStatus);
    return [...set].sort();
  }, [lines]);

  const filtered = React.useMemo(
    () =>
      lines.filter((l) => {
        if (typeFilter !== "all" && l.recordType !== typeFilter) return false;
        if (categoryFilter !== "all" && l.categoryLabel !== categoryFilter) return false;
        if (statusFilter !== "all" && l.paymentStatus !== statusFilter) return false;
        return true;
      }),
    [lines, typeFilter, categoryFilter, statusFilter],
  );

  React.useEffect(() => {
    setPage(1);
  }, [typeFilter, categoryFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  const money = (n: number) => new Intl.NumberFormat(undefined, { style: "currency", currency }).format(n);

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
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {locked ? (
            <Badge variant="secondary" className="gap-1">
              <Lock className="h-3 w-3" />
              Financials locked
            </Badge>
          ) : null}
          <p className="text-xs text-muted-foreground">
            All amounts shown in {currency}. Actuals are updated in real time.
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

      <FinancialSummaryCards
        summary={overview?.summary ?? null}
        analytics={overview?.analytics ?? null}
        loading={loading}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <RevenueExpensesChart analytics={overview?.analytics ?? null} currency={currency} />
        {overview ? <BreakEvenPanel breakEven={overview.breakEven} currency={currency} /> : null}
        {overview ? <ForecastPanel forecast={overview.forecast} currency={currency} /> : null}
      </div>

      <Card className="shadow-sm">
        <CardHeader className="flex flex-col gap-3 pb-3 lg:flex-row lg:items-center lg:justify-between">
          <CardTitle className="text-base">Financial Records</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-9 w-[130px]">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="revenue">Revenue</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-9 w-[150px]">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-[130px]">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {statuses.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => toast.info("Advanced filters coming soon.")}
            >
              <ListFilter className="mr-1.5 h-4 w-4" />
              Filters
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Date</TableHead>
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
              {pageRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="py-8 text-center text-sm text-muted-foreground">
                    No records match your filters.
                  </TableCell>
                </TableRow>
              ) : (
                pageRows.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatDate(line.paidDate ?? line.dueDate)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          "border-0 text-[10px] capitalize",
                          line.recordType === "revenue"
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                            : "bg-red-500/15 text-red-700 dark:text-red-400",
                        )}
                      >
                        {line.recordType}
                      </Badge>
                    </TableCell>
                    <TableCell>{line.categoryLabel}</TableCell>
                    <TableCell className="hidden md:table-cell">{line.payeeName ?? "—"}</TableCell>
                    <TableCell className="hidden max-w-[200px] truncate lg:table-cell">
                      {line.description ?? "—"}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-medium tabular-nums",
                        line.recordType === "revenue"
                          ? "text-emerald-700 dark:text-emerald-400"
                          : "text-red-700 dark:text-red-400",
                      )}
                    >
                      {line.recordType === "expense" ? "-" : ""}
                      {money(line.total)}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("border-0 text-[10px] capitalize", statusClass(line.paymentStatus))}>
                        {line.paymentStatus}
                      </Badge>
                    </TableCell>
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
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-2 text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            {filtered.length > 0 ? (
              <span>
                Showing {pageStart + 1} to {Math.min(pageStart + PAGE_SIZE, filtered.length)} of {filtered.length}{" "}
                records
              </span>
            ) : (
              <span>No records</span>
            )}
            {totalPages > 1 ? (
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="h-7 w-7"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="px-1 tabular-nums">{safePage}</span>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="h-7 w-7"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            ) : null}
          </div>
          {overview ? (
            <div className="flex items-center gap-4">
              <span className="text-muted-foreground">
                Total revenue{" "}
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                  {money(overview.summary.grossRevenue.actual)}
                </span>
              </span>
              <span className="text-muted-foreground">
                Total expenses{" "}
                <span className="font-semibold text-red-700 dark:text-red-400">
                  {money(overview.summary.totalExpenses.actual)}
                </span>
              </span>
            </div>
          ) : null}
        </div>
      </Card>

      {canManage ? (
        <>
          <ExpenseFormDialog open={expenseOpen} onOpenChange={setExpenseOpen} eventId={props.eventId} onSaved={load} />
          <RevenueFormDialog open={revenueOpen} onOpenChange={setRevenueOpen} eventId={props.eventId} onSaved={load} />
        </>
      ) : null}
    </div>
  );
}
