"use client";

import type { VenueHostChartFilter, VenueHostOverview } from "@/lib/event-platform/event-venue-host/event-venue-host-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function money(n: number | null | undefined, currency: string) {
  if (n == null) return "—";
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(n);
}

function pct(n: number | null | undefined) {
  if (n == null) return "—";
  return `${n.toFixed(1)}%`;
}

function MetricItem(props: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-2.5">
      <p className="text-[11px] text-muted-foreground">{props.label}</p>
      <p className="text-sm font-semibold tabular-nums">{props.value}</p>
      {props.hint ? <p className="text-[10px] text-muted-foreground">{props.hint}</p> : null}
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
    <div className="grid gap-2 sm:grid-cols-2">
      <MetricItem label="Times used" value={String(m.timesUsed)} />
      <MetricItem label="Upcoming events" value={String(m.upcomingEventCount)} />
      <MetricItem label="Completed events" value={String(m.completedEventCount)} />
      <MetricItem label="Avg registrations" value={m.averageRegistrations != null ? String(m.averageRegistrations) : "—"} />
      <MetricItem label="Avg attendance" value={m.averageAttendance != null ? String(m.averageAttendance) : "—"} />
      <MetricItem label="Avg check-in rate" value={pct(m.averageCheckInRate)} />
      <MetricItem label="Avg revenue" value={money(m.averageRevenue, c)} />
      <MetricItem label="Avg expenses" value={money(m.averageExpenses, c)} />
      <MetricItem label="Avg profit" value={money(m.averageProfit, c)} />
      <MetricItem label="Avg profit margin" value={pct(m.averageProfitMargin)} />
      <MetricItem label="Avg bonus-card sales" value={m.averageBonusCardSales != null ? String(m.averageBonusCardSales) : "—"} />
      <MetricItem label="Returning-customer rate" value={pct(m.returningCustomerRate)} />
      <MetricItem label="Avg event rating" value={m.averageEventRating.label} hint="Future feature" />
      {m.highestPerformingEvent ? (
        <MetricItem
          label="Highest-performing event"
          value={money(m.highestPerformingEvent.profit, c)}
          hint={m.highestPerformingEvent.title}
        />
      ) : null}
      {m.lowestPerformingEvent ? (
        <MetricItem
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
    <div className="grid gap-2 sm:grid-cols-2">
      <MetricItem label="Total assigned events" value={String(m.totalAssignedEvents)} />
      <MetricItem label="Completed events" value={String(m.completedEvents)} />
      <MetricItem label="Cancelled events" value={String(m.cancelledEvents)} />
      <MetricItem label="Avg attendance" value={m.averageAttendance != null ? String(m.averageAttendance) : "—"} />
      <MetricItem label="Avg check-in rate" value={pct(m.averageCheckInRate)} />
      <MetricItem label="Avg revenue" value={money(m.averageRevenue, c)} />
      <MetricItem label="Total revenue generated" value={money(m.totalRevenueGenerated, c)} />
      <MetricItem label="Avg profit" value={money(m.averageProfit, c)} />
      <MetricItem label="Avg bonus-card sales" value={m.averageBonusCardSales != null ? String(m.averageBonusCardSales) : "—"} />
      <MetricItem label="Avg event rating" value={m.averageEventRating.label} hint="Future feature" />
      <MetricItem label="Returning-attendee %" value={pct(m.returningAttendeePercentage)} />
      <MetricItem
        label="On-time arrival %"
        value={m.onTimeArrivalPercentage === "available" ? pct(m.onTimeArrivalRate) : "Not Available"}
        hint={m.onTimeArrivalPercentage === "not_available" ? "Record scheduled & actual arrival on events" : undefined}
      />
      <MetricItem label="Total games hosted" value={m.totalGamesHosted != null ? String(m.totalGamesHosted) : "—"} />
      <MetricItem label="Incident count" value={m.incidentCount === "not_available" ? "Not Available" : String(m.incidents ?? 0)} hint="Future feature" />
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
