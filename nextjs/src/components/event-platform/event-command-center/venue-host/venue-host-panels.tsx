"use client";

import * as React from "react";
import {
  AlertTriangle,
  Award,
  Calendar,
  CalendarClock,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  Gamepad2,
  Percent,
  Receipt,
  Repeat,
  ScanLine,
  Star,
  TrendingUp,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";

import type { VenueHostChartFilter, VenueHostOverview } from "@/lib/event-platform/event-venue-host/event-venue-host-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

function money(n: number | null | undefined, currency: string) {
  if (n == null) return "—";
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(n);
}

function pct(n: number | null | undefined) {
  if (n == null) return "—";
  return `${n.toFixed(1)}%`;
}

function MetricItem(props: {
  label: string;
  value: string;
  hint?: string;
  icon?: React.ComponentType<{ className?: string }>;
  tint?: string;
}) {
  const { label, value, hint, icon: Icon, tint } = props;
  return (
    <div className="flex items-start gap-2.5 rounded-lg border bg-muted/20 p-2.5">
      {Icon ? (
        <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md", tint ?? "bg-muted text-muted-foreground")}>
          <Icon className="h-4 w-4" />
        </div>
      ) : null}
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold tabular-nums">{value}</p>
        {hint ? <p className="text-[10px] text-muted-foreground">{hint}</p> : null}
      </div>
    </div>
  );
}

export function ChartFilterSelect(props: {
  value: VenueHostChartFilter;
  onChange: (v: VenueHostChartFilter) => void;
}) {
  return (
    <Select value={props.value} onValueChange={(v) => props.onChange(v as VenueHostChartFilter)}>
      <SelectTrigger className="h-8 w-[160px] text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="last_5">Last 5 events</SelectItem>
        <SelectItem value="last_10">Last 10 events</SelectItem>
        <SelectItem value="last_12_months">Last 12 months</SelectItem>
        <SelectItem value="all">All available</SelectItem>
      </SelectContent>
    </Select>
  );
}

export function VenueMetricsGrid(props: { metrics: VenueHostOverview["venue"]["metrics"]; currency: string }) {
  const m = props.metrics;
  const c = props.currency;
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      <MetricItem icon={Calendar} tint="bg-blue-100 text-blue-600" label="Times used" value={String(m.timesUsed)} />
      <MetricItem icon={CalendarClock} tint="bg-sky-100 text-sky-600" label="Upcoming events" value={String(m.upcomingEventCount)} />
      <MetricItem icon={CheckCircle2} tint="bg-emerald-100 text-emerald-600" label="Completed events" value={String(m.completedEventCount)} />
      <MetricItem icon={Users} tint="bg-violet-100 text-violet-600" label="Avg registrations" value={m.averageRegistrations != null ? String(m.averageRegistrations) : "—"} />
      <MetricItem icon={UserCheck} tint="bg-teal-100 text-teal-600" label="Avg attendance" value={m.averageAttendance != null ? String(m.averageAttendance) : "—"} />
      <MetricItem icon={ScanLine} tint="bg-cyan-100 text-cyan-600" label="Avg check-in rate" value={pct(m.averageCheckInRate)} />
      <MetricItem icon={DollarSign} tint="bg-green-100 text-green-600" label="Avg revenue" value={money(m.averageRevenue, c)} />
      <MetricItem icon={Receipt} tint="bg-rose-100 text-rose-600" label="Avg expenses" value={money(m.averageExpenses, c)} />
      <MetricItem icon={TrendingUp} tint="bg-emerald-100 text-emerald-600" label="Avg profit" value={money(m.averageProfit, c)} />
      <MetricItem icon={Percent} tint="bg-amber-100 text-amber-600" label="Avg profit margin" value={pct(m.averageProfitMargin)} />
      <MetricItem icon={CreditCard} tint="bg-indigo-100 text-indigo-600" label="Avg bonus-card sales" value={m.averageBonusCardSales != null ? String(m.averageBonusCardSales) : "—"} />
      <MetricItem icon={Repeat} tint="bg-fuchsia-100 text-fuchsia-600" label="Returning-customer rate" value={pct(m.returningCustomerRate)} />
      <MetricItem icon={Star} tint="bg-amber-100 text-amber-500" label="Avg event rating" value={m.averageEventRating.label} hint="Future feature" />
      {m.highestPerformingEvent ? (
        <MetricItem
          icon={Award}
          tint="bg-emerald-100 text-emerald-600"
          label="Highest-performing event"
          value={money(m.highestPerformingEvent.profit, c)}
          hint={m.highestPerformingEvent.title}
        />
      ) : null}
      {m.lowestPerformingEvent ? (
        <MetricItem
          icon={Award}
          tint="bg-rose-100 text-rose-600"
          label="Lowest-performing event"
          value={money(m.lowestPerformingEvent.profit, c)}
          hint={m.lowestPerformingEvent.title}
        />
      ) : null}
    </div>
  );
}

export function HostMetricsGrid(props: { metrics: VenueHostOverview["host"]["metrics"]; currency: string }) {
  const m = props.metrics;
  const c = props.currency;
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      <MetricItem icon={Calendar} tint="bg-blue-100 text-blue-600" label="Total assigned events" value={String(m.totalAssignedEvents)} />
      <MetricItem icon={CheckCircle2} tint="bg-emerald-100 text-emerald-600" label="Completed events" value={String(m.completedEvents)} />
      <MetricItem icon={XCircle} tint="bg-rose-100 text-rose-600" label="Cancelled events" value={String(m.cancelledEvents)} />
      <MetricItem icon={UserCheck} tint="bg-teal-100 text-teal-600" label="Avg attendance" value={m.averageAttendance != null ? String(m.averageAttendance) : "—"} />
      <MetricItem icon={ScanLine} tint="bg-cyan-100 text-cyan-600" label="Avg check-in rate" value={pct(m.averageCheckInRate)} />
      <MetricItem icon={DollarSign} tint="bg-green-100 text-green-600" label="Avg revenue" value={money(m.averageRevenue, c)} />
      <MetricItem icon={DollarSign} tint="bg-emerald-100 text-emerald-600" label="Total revenue generated" value={money(m.totalRevenueGenerated, c)} />
      <MetricItem icon={TrendingUp} tint="bg-emerald-100 text-emerald-600" label="Avg profit" value={money(m.averageProfit, c)} />
      <MetricItem icon={CreditCard} tint="bg-indigo-100 text-indigo-600" label="Avg bonus-card sales" value={m.averageBonusCardSales != null ? String(m.averageBonusCardSales) : "—"} />
      <MetricItem icon={Star} tint="bg-amber-100 text-amber-500" label="Avg event rating" value={m.averageEventRating.label} hint="Future feature" />
      <MetricItem icon={Repeat} tint="bg-fuchsia-100 text-fuchsia-600" label="Returning-attendee %" value={pct(m.returningAttendeePercentage)} />
      <MetricItem
        icon={Clock}
        tint="bg-sky-100 text-sky-600"
        label="On-time arrival %"
        value={m.onTimeArrivalPercentage === "available" ? pct(m.onTimeArrivalRate) : "Not Available"}
        hint={m.onTimeArrivalPercentage === "not_available" ? "Record scheduled & actual arrival on events" : undefined}
      />
      <MetricItem icon={Gamepad2} tint="bg-violet-100 text-violet-600" label="Total games hosted" value={m.totalGamesHosted != null ? String(m.totalGamesHosted) : "—"} />
      <MetricItem icon={AlertTriangle} tint="bg-amber-100 text-amber-600" label="Incident count" value={m.incidentCount === "not_available" ? "Not Available" : String(m.incidents ?? 0)} hint="Future feature" />
    </div>
  );
}

export function PerformanceChartBlock(props: {
  title: string;
  points: VenueHostOverview["venue"]["charts"];
  field: "attendance" | "revenue" | "profit" | "rating";
  currency?: string;
}) {
  const max = Math.max(1, ...props.points.map((p) => Math.abs(p[props.field] ?? 0)));
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{props.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {props.points.length === 0 ? (
          <p className="text-xs text-muted-foreground">No historical events for this filter.</p>
        ) : (
          props.points.map((p) => {
            const raw = p[props.field] ?? 0;
            const display =
              props.field === "revenue" || props.field === "profit"
                ? money(raw, props.currency ?? "USD")
                : props.field === "rating"
                  ? "N/A"
                  : String(raw);
            return (
              <div key={p.eventId}>
                <div className="flex justify-between text-xs">
                  <span className="truncate pr-2">{p.label}</span>
                  <span className="shrink-0 tabular-nums font-medium">{display}</span>
                </div>
                {props.field !== "rating" ? (
                  <div className="mt-1 h-1.5 rounded-full bg-muted">
                    <div
                      className={`h-1.5 rounded-full ${props.field === "profit" && raw < 0 ? "bg-red-500" : "bg-primary"}`}
                      style={{ width: `${(Math.abs(raw) / max) * 100}%` }}
                    />
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

export function DetailRow(props: { label: string; value: string | null | undefined }) {
  if (!props.value?.trim()) return null;
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
      <span className="min-w-[8rem] text-muted-foreground">{props.label}</span>
      <span className="font-medium">{props.value}</span>
    </div>
  );
}

export function IconDetailRow(props: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  const { icon: Icon, label, value } = props;
  if (value == null || value === "" || value === "—") return null;
  return (
    <div className="flex items-start gap-3 py-1.5 text-sm">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="w-24 shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 flex-1 font-medium">{value}</span>
    </div>
  );
}
