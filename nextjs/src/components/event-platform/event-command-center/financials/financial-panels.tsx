"use client";

import * as React from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CircleDollarSign, MinusCircle, PieChart, ShoppingCart, TrendingUp, Users, Wallet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EventFinancialsOverview } from "@/lib/event-platform/event-financials/event-financials-types";
import { cn } from "@/lib/utils";

function money(n: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(n);
}

function compactMoney(n: number) {
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return `$${Math.round(n)}`;
}

/** Small inline sparkline (area + line). */
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const id = React.useId();
  if (data.length < 2) return null;
  const w = 120;
  const h = 34;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = w / (data.length - 1);
  const points = data.map((v, i) => [i * step, h - ((v - min) / range) * (h - 4) - 2] as const);
  const line = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `0,${h} ${line} ${w},${h}`;

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="mt-2">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${id})`} />
      <polyline points={line} fill="none" stroke={color} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function FinancialSummaryCards(props: {
  summary: EventFinancialsOverview["summary"] | null;
  analytics?: EventFinancialsOverview["analytics"] | null;
  loading?: boolean;
}) {
  if (props.loading || !props.summary) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="shadow-sm">
            <CardContent className="h-[104px] animate-pulse bg-muted/40 p-4" />
          </Card>
        ))}
      </div>
    );
  }

  const s = props.summary;
  const c = s.currency;

  const trend = props.analytics?.revenueVsExpenses ?? [];
  const revSeries: number[] = [];
  const expSeries: number[] = [];
  const profitSeries: number[] = [];
  let cr = 0;
  let ce = 0;
  for (const p of trend) {
    cr += p.revenue;
    ce += p.expenses;
    revSeries.push(cr);
    expSeries.push(ce);
    profitSeries.push(cr - ce);
  }

  const topCards = [
    {
      label: "Gross revenue",
      value: money(s.grossRevenue.actual, c),
      hint: `From ${s.orderCount} sales`,
      icon: <CircleDollarSign className="h-4 w-4" />,
      iconClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
      series: revSeries,
      color: "hsl(142 71% 45%)",
    },
    {
      label: "Total expenses",
      value: money(s.totalExpenses.actual, c),
      hint: s.totalExpenses.pending > 0 ? `+${money(s.totalExpenses.pending, c)} pending` : "No pending",
      icon: <MinusCircle className="h-4 w-4" />,
      iconClass: "bg-red-500/15 text-red-600 dark:text-red-400",
      series: expSeries,
      color: "hsl(0 72% 55%)",
    },
    {
      label: "Net profit",
      value: money(s.netProfit.actual, c),
      hint:
        s.netProfit.projected !== s.netProfit.actual
          ? `Projected ${money(s.netProfit.projected, c)}`
          : "Actual",
      icon: <TrendingUp className="h-4 w-4" />,
      iconClass: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
      series: profitSeries,
      color: "hsl(217 91% 60%)",
    },
    {
      label: "Profit margin",
      value: s.profitMargin.actual != null ? `${s.profitMargin.actual.toFixed(1)}%` : "—",
      hint: "Actual only",
      icon: <PieChart className="h-4 w-4" />,
      iconClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
      series: profitSeries,
      color: "hsl(38 92% 50%)",
    },
  ];

  const bottomCards = [
    {
      label: "Revenue / attendee",
      value: s.revenuePerAttendee != null ? money(s.revenuePerAttendee, c) : "—",
      hint: "Avg per attendee",
      icon: <Users className="h-4 w-4" />,
      iconClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Cost / attendee",
      value: s.costPerAttendee != null ? money(s.costPerAttendee, c) : "—",
      hint: "Avg per attendee",
      icon: <Wallet className="h-4 w-4" />,
      iconClass: "bg-red-500/15 text-red-600 dark:text-red-400",
    },
    {
      label: "Avg order value",
      value: s.averageOrderValue != null ? money(s.averageOrderValue, c) : "—",
      hint: "Per transaction",
      icon: <ShoppingCart className="h-4 w-4" />,
      iconClass: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
    },
    {
      label: "Outstanding payments",
      value: String(s.outstandingPayments),
      hint: "Total unpaid",
      icon: <MinusCircle className="h-4 w-4" />,
      iconClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {topCards.map((card) => (
          <Card key={card.label} className="shadow-sm">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
                  <p className="text-2xl font-bold tabular-nums tracking-tight">{card.value}</p>
                  <p className="text-[11px] text-muted-foreground">{card.hint}</p>
                </div>
                <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", card.iconClass)}>
                  {card.icon}
                </span>
              </div>
              <Sparkline data={card.series} color={card.color} />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {bottomCards.map((card) => (
          <Card key={card.label} className="shadow-sm">
            <CardContent className="flex items-start justify-between gap-2 p-3 sm:p-4">
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
                <p className="text-xl font-bold tabular-nums tracking-tight">{card.value}</p>
                <p className="text-[11px] text-muted-foreground">{card.hint}</p>
              </div>
              <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", card.iconClass)}>
                {card.icon}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

const RANGE_OPTIONS: Array<{ value: number | "all"; label: string }> = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: "all", label: "All time" },
];

export function RevenueExpensesChart(props: {
  analytics: EventFinancialsOverview["analytics"] | null;
  currency: string;
}) {
  const [range, setRange] = React.useState<number | "all">("all");
  const trend = props.analytics?.revenueVsExpenses ?? [];

  const cumulative = React.useMemo(() => {
    let cr = 0;
    let ce = 0;
    return trend.map((p) => {
      cr += p.revenue;
      ce += p.expenses;
      return { label: p.label, revenue: Math.round(cr), expenses: Math.round(ce), profit: Math.round(cr - ce) };
    });
  }, [trend]);

  const data = range === "all" ? cumulative : cumulative.slice(-range);

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-base">Revenue vs Expenses</CardTitle>
        <div className="flex gap-1" role="group" aria-label="Chart range">
          {RANGE_OPTIONS.map((opt) => (
            <Button
              key={String(opt.value)}
              type="button"
              size="sm"
              variant={range === opt.value ? "secondary" : "ghost"}
              className="h-7 px-2 text-xs"
              onClick={() => setRange(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">No financial activity yet.</p>
        ) : (
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(142 71% 45%)" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="hsl(142 71% 45%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} minTickGap={24} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                  width={44}
                  tickFormatter={(v) => compactMoney(Number(v))}
                />
                <Tooltip
                  formatter={(v, name) => [money(Number(v), props.currency), name]}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="hsl(142 71% 45%)" strokeWidth={2} fill="url(#revFill)" />
                <Line type="monotone" dataKey="expenses" name="Expenses" stroke="hsl(0 72% 55%)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="profit" name="Profit" stroke="hsl(217 91% 60%)" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function polar(cx: number, cy: number, r: number, angleDeg: number): [number, number] {
  const a = (angleDeg * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy - r * Math.sin(a)];
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const [x1, y1] = polar(cx, cy, r, startDeg);
  const [x2, y2] = polar(cx, cy, r, endDeg);
  const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
  const sweep = endDeg < startDeg ? 1 : 0;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} ${sweep} ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

function BreakEvenGauge({ percent, above }: { percent: number; above: boolean }) {
  const cx = 100;
  const cy = 100;
  const r = 82;
  const fraction = Math.min(1, Math.max(0, percent / 100));
  const endDeg = 180 - 180 * fraction;
  const tone = above ? "stroke-emerald-500" : percent >= 60 ? "stroke-amber-500" : "stroke-red-500";

  return (
    <div className="relative mx-auto w-[200px]">
      <svg viewBox="0 0 200 116" className="w-full">
        <path d={arcPath(cx, cy, r, 180, 0)} fill="none" strokeWidth={14} strokeLinecap="round" className="stroke-muted" />
        <path
          d={arcPath(cx, cy, r, 180, endDeg)}
          fill="none"
          strokeWidth={14}
          strokeLinecap="round"
          className={cn("transition-all duration-700", tone)}
        />
      </svg>
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
        <span className="text-2xl font-bold tabular-nums">{Math.round(percent)}%</span>
        <span className="text-xs text-muted-foreground">{above ? "Above break-even" : "To break-even"}</span>
      </div>
    </div>
  );
}

export function BreakEvenPanel(props: { breakEven: EventFinancialsOverview["breakEven"]; currency: string }) {
  const b = props.breakEven;
  const fmt = (n: number) => money(n, props.currency);
  const above = b.amountAboveOrBelow >= 0;
  const percent =
    b.breakEvenRevenue > 0
      ? (b.currentCollectedRevenue / b.breakEvenRevenue) * 100
      : b.currentCollectedRevenue > 0
        ? 100
        : 0;

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Break-even</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="space-y-2">
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
            <span className={cn("font-medium tabular-nums", above ? "text-emerald-600" : "text-red-600")}>
              {above ? "+" : ""}
              {fmt(b.amountAboveOrBelow)}
            </span>
          </div>
        </div>
        <BreakEvenGauge percent={percent} above={above} />
        {b.ticketsNeeded != null ? (
          <p className="text-center text-xs text-muted-foreground">
            ~{b.ticketsNeeded} ticket(s) needed to break even
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function ForecastPanel(props: { forecast: EventFinancialsOverview["forecast"]; currency: string }) {
  const f = props.forecast;
  const fmt = (n: number) => money(n, props.currency);
  return (
    <Card className="border-violet-500/30 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <div>
          <CardTitle className="text-base">Forecast</CardTitle>
          <p className="text-xs text-muted-foreground">{f.label}</p>
        </div>
        <Badge className="border-0 bg-violet-500/15 text-violet-600 dark:text-violet-400">Projected</Badge>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Projected attendees</span>
          <span className="tabular-nums font-medium">{f.projectedAttendees}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Ticket revenue</span>
          <span className="tabular-nums">{fmt(f.projectedTicketRevenue)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Bonus-card revenue</span>
          <span className="tabular-nums">{fmt(f.projectedBonusCardRevenue)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total expenses</span>
          <span className="tabular-nums">{fmt(f.projectedExpenses)}</span>
        </div>
        <div className="mt-1 flex justify-between border-t pt-2 font-semibold">
          <span>Projected net profit</span>
          <span className={cn("tabular-nums", f.projectedNetProfit >= 0 ? "text-emerald-600" : "text-red-600")}>
            {fmt(f.projectedNetProfit)}
          </span>
        </div>
        {f.projectedMargin != null ? (
          <p className="text-xs text-muted-foreground">Margin ~{f.projectedMargin.toFixed(1)}%</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
