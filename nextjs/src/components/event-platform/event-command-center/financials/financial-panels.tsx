"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EventFinancialsOverview } from "@/lib/event-platform/event-financials/event-financials-types";

function money(n: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(n);
}

export function FinancialSummaryCards(props: {
  summary: EventFinancialsOverview["summary"] | null;
  loading?: boolean;
}) {
  if (props.loading || !props.summary) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="shadow-sm">
            <CardContent className="h-16 animate-pulse bg-muted/40 p-4" />
          </Card>
        ))}
      </div>
    );
  }

  const s = props.summary;
  const c = s.currency;

  const items = [
    {
      label: "Gross revenue",
      actual: money(s.grossRevenue.actual, c),
      sub: s.grossRevenue.pending > 0 ? `+${money(s.grossRevenue.pending, c)} pending` : undefined,
    },
    {
      label: "Total expenses",
      actual: money(s.totalExpenses.actual, c),
      sub: s.totalExpenses.pending > 0 ? `+${money(s.totalExpenses.pending, c)} pending` : undefined,
    },
    {
      label: "Net profit",
      actual: money(s.netProfit.actual, c),
      sub: s.netProfit.projected !== s.netProfit.actual ? `Projected ${money(s.netProfit.projected, c)}` : undefined,
    },
    {
      label: "Profit margin",
      actual: s.profitMargin.actual != null ? `${s.profitMargin.actual.toFixed(1)}%` : "—",
      sub: "Actual only",
    },
    {
      label: "Revenue / attendee",
      actual: s.revenuePerAttendee != null ? money(s.revenuePerAttendee, c) : "—",
    },
    {
      label: "Cost / attendee",
      actual: s.costPerAttendee != null ? money(s.costPerAttendee, c) : "—",
    },
    {
      label: "Avg order value",
      actual: s.averageOrderValue != null ? money(s.averageOrderValue, c) : "—",
    },
    {
      label: "Outstanding payments",
      actual: String(s.outstandingPayments),
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label} className="shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="text-xl font-bold tabular-nums">{item.actual}</p>
            {item.sub ? <p className="text-[10px] text-muted-foreground">{item.sub}</p> : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function BreakEvenPanel(props: { breakEven: EventFinancialsOverview["breakEven"]; currency: string }) {
  const b = props.breakEven;
  const fmt = (n: number) => money(n, props.currency);
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Break-even</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Break-even revenue</span>
          <span className="font-medium tabular-nums">{fmt(b.breakEvenRevenue)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Collected (actual)</span>
          <span className="font-medium tabular-nums">{fmt(b.currentCollectedRevenue)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Above / below</span>
          <span className={`font-medium tabular-nums ${b.amountAboveOrBelow >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {b.amountAboveOrBelow >= 0 ? "+" : ""}
            {fmt(b.amountAboveOrBelow)}
          </span>
        </div>
        {b.ticketsNeeded != null ? (
          <p className="text-xs text-muted-foreground">~{b.ticketsNeeded} ticket(s) needed to break even</p>
        ) : null}
        {b.bonusCardsNeeded != null ? (
          <p className="text-xs text-muted-foreground">~{b.bonusCardsNeeded} bonus card(s) needed</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function ForecastPanel(props: { forecast: EventFinancialsOverview["forecast"]; currency: string }) {
  const f = props.forecast;
  const fmt = (n: number) => money(n, props.currency);
  return (
    <Card className="shadow-sm border-dashed">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Forecast</CardTitle>
        <p className="text-xs text-muted-foreground">{f.label}</p>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span>Projected attendees</span>
          <span className="tabular-nums font-medium">{f.projectedAttendees}</span>
        </div>
        <div className="flex justify-between">
          <span>Ticket revenue</span>
          <span className="tabular-nums">{fmt(f.projectedTicketRevenue)}</span>
        </div>
        <div className="flex justify-between">
          <span>Bonus-card revenue</span>
          <span className="tabular-nums">{fmt(f.projectedBonusCardRevenue)}</span>
        </div>
        <div className="flex justify-between">
          <span>Expenses</span>
          <span className="tabular-nums">{fmt(f.projectedExpenses)}</span>
        </div>
        <div className="flex justify-between font-medium">
          <span>Net profit</span>
          <span className="tabular-nums">{fmt(f.projectedNetProfit)}</span>
        </div>
        {f.projectedMargin != null ? (
          <p className="text-xs text-muted-foreground">Margin ~{f.projectedMargin.toFixed(1)}%</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function FinancialAnalyticsCharts(props: { analytics: EventFinancialsOverview["analytics"] | null }) {
  if (!props.analytics) return null;
  const a = props.analytics;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartBlock
        title="Revenue vs expenses"
        items={a.revenueVsExpenses.map((x) => ({
          label: x.label,
          primary: x.revenue,
          secondary: x.expenses,
        }))}
        dual
      />
      <ChartBlock title="Expense by category" items={a.expenseByCategory.map((x) => ({ label: x.label, value: x.amount }))} />
      <ChartBlock title="Revenue by source" items={a.revenueBySource.map((x) => ({ label: x.label, value: x.amount }))} />
      <ChartBlock title="Profit vs previous events" items={a.profitVsPreviousEvents.map((x) => ({ label: x.label, value: x.netProfit }))} />
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Actual vs projected net</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Actual net</span>
            <span className="tabular-nums font-medium">{a.actualVsProjected.actualNet.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Projected net</span>
            <span className="tabular-nums">{a.actualVsProjected.projectedNet.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Break-even progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-1 flex justify-between text-xs">
            <span>{a.breakEvenProgress.percent.toFixed(0)}%</span>
            <span className="text-muted-foreground">
              {a.breakEvenProgress.collected.toFixed(0)} / {a.breakEvenProgress.breakEven.toFixed(0)}
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted">
            <div className="h-2 rounded-full bg-primary" style={{ width: `${a.breakEvenProgress.percent}%` }} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ChartBlock(props: {
  title: string;
  items: Array<{ label: string; value?: number; primary?: number; secondary?: number }>;
  dual?: boolean;
}) {
  const max = Math.max(
    1,
    ...props.items.flatMap((i) => [i.value ?? 0, i.primary ?? 0, i.secondary ?? 0]),
  );
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{props.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {props.items.length === 0 ? (
          <p className="text-xs text-muted-foreground">No data yet.</p>
        ) : (
          props.items.map((item) => (
            <div key={item.label}>
              <div className="flex justify-between text-xs">
                <span>{item.label}</span>
                <span className="tabular-nums font-medium">
                  {props.dual
                    ? `${(item.primary ?? 0).toFixed(0)} / ${(item.secondary ?? 0).toFixed(0)}`
                    : (item.value ?? 0).toFixed(2)}
                </span>
              </div>
              {props.dual ? (
                <div className="mt-1 flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-emerald-500" style={{ width: `${((item.primary ?? 0) / max) * 100}%` }} />
                  <div className="h-full bg-red-400" style={{ width: `${((item.secondary ?? 0) / max) * 100}%` }} />
                </div>
              ) : (
                <div className="mt-1 h-1.5 rounded-full bg-muted">
                  <div className="h-1.5 rounded-full bg-primary" style={{ width: `${((item.value ?? 0) / max) * 100}%` }} />
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
