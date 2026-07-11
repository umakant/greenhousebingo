"use client";

import * as React from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { CommandCenterCharts } from "@/lib/event-platform/command-center/command-center-types";
import { cn } from "@/lib/utils";

type RegistrationTrendChartProps = {
  data: CommandCenterCharts["registrationTrend"] | null;
  loading?: boolean;
  error?: string | null;
  rangeDays: number | "all";
  onRangeChange: (range: number | "all") => void;
};

const RANGE_OPTIONS: Array<{ value: number | "all"; label: string }> = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: "all", label: "All time" },
];

export function RegistrationTrendChart(props: RegistrationTrendChartProps) {
  const chartData = props.data?.points ?? [];
  const capacity = props.data?.capacityTarget;

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-base">Registration Trend</CardTitle>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Registration trend range">
          {RANGE_OPTIONS.map((opt) => (
            <Button
              key={String(opt.value)}
              type="button"
              size="sm"
              variant={props.rangeDays === opt.value ? "secondary" : "ghost"}
              className="h-7 px-2 text-xs"
              onClick={() => props.onRangeChange(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {props.loading ? (
          <Skeleton className="h-64 w-full" aria-label="Loading registration chart" />
        ) : props.error ? (
          <div className="flex h-64 items-center justify-center text-sm text-destructive">{props.error}</div>
        ) : chartData.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-1 text-sm text-muted-foreground">
            <p>No registrations in this period.</p>
            {capacity != null ? <p className="text-xs">Capacity target: {capacity}</p> : null}
          </div>
        ) : (
          <div className="h-64" aria-label="Registration trend chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  formatter={(value, name) => [
                    Number(value ?? 0),
                    name === "cumulative" ? "Cumulative" : "Daily",
                  ]}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="daily"
                  name="Daily"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="cumulative"
                  name="Cumulative"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
            {capacity != null ? (
              <p className="mt-2 text-xs text-muted-foreground">Capacity target: {capacity}</p>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function CheckInTrendChart(props: {
  data: CommandCenterCharts["checkInTrend"] | null;
  loading?: boolean;
  error?: string | null;
}) {
  const preEvent = props.data?.preEvent ?? true;
  const points = props.data?.points ?? [];
  const remaining = props.data?.remainingExpected ?? 0;

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Check-in trend</CardTitle>
      </CardHeader>
      <CardContent>
        {props.loading ? (
          <Skeleton className="h-64 w-full" aria-label="Loading check-in chart" />
        ) : props.error ? (
          <div className="flex h-64 items-center justify-center text-sm text-destructive">{props.error}</div>
        ) : preEvent ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Pre-event</p>
            <p>Check-in tracking begins when the event starts.</p>
            <p className="text-xs">{remaining} expected attendee(s) not yet checked in</p>
          </div>
        ) : points.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-1 text-sm text-muted-foreground">
            <p>No check-ins recorded yet.</p>
            <p className="text-xs">{remaining} still expected</p>
          </div>
        ) : (
          <div className="h-64" aria-label="Check-in trend chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="checkIns"
                  name="Check-ins"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
            <p className="mt-2 text-xs text-muted-foreground">
              {remaining} remaining expected · Walk-ins not configured
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function RevenueExpensesChart(props: {
  data: CommandCenterCharts["revenueVsExpenses"] | null;
  loading?: boolean;
  error?: string | null;
  formatMoney: (value: number) => string;
}) {
  const revenueRows = props.data?.revenue ?? [];
  const expenseRows = props.data?.expenses ?? [];

  const chartData = [
    ...revenueRows.map((r) => ({
      name: r.label,
      amount: r.metric.availability === "not_configured" ? null : (r.metric.value ?? 0),
      group: "Revenue",
      unavailable: r.metric.availability === "not_configured",
    })),
    ...expenseRows.map((r) => ({
      name: r.label,
      amount: r.metric.availability === "not_configured" ? null : (r.metric.value ?? 0),
      group: "Expenses",
      unavailable: r.metric.availability === "not_configured",
    })),
  ];

  const hasAnyData = chartData.some((d) => !d.unavailable);

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Revenue vs Expenses</CardTitle>
      </CardHeader>
      <CardContent>
        {props.loading ? (
          <Skeleton className="h-72 w-full" />
        ) : props.error ? (
          <div className="flex h-72 items-center justify-center text-sm text-destructive">{props.error}</div>
        ) : !hasAnyData ? (
          <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
            Financial breakdown not configured yet.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Revenue</p>
                <ul className="space-y-2 text-sm">
                  {revenueRows.map((row) => (
                    <li key={row.key} className="flex items-center justify-between gap-2">
                      <span>{row.label}</span>
                      <span
                        className={cn(
                          "font-medium tabular-nums",
                          row.metric.availability === "not_configured" && "text-muted-foreground",
                        )}
                      >
                        {row.metric.availability === "not_configured"
                          ? "Not configured"
                          : props.formatMoney(row.metric.value ?? 0)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Expenses</p>
                <ul className="space-y-2 text-sm">
                  {expenseRows.map((row) => (
                    <li key={row.key} className="flex items-center justify-between gap-2">
                      <span>{row.label}</span>
                      <span className="text-muted-foreground">
                        {row.metric.availability === "not_configured" ? "Not configured" : props.formatMoney(row.metric.value ?? 0)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
