"use client";

import * as React from "react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, XAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  EventAttendeesAnalytics,
  EventAttendeesSummary,
} from "@/lib/event-platform/attendees/event-attendees-types";

function money(value: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

function PanelCard(props: { title: string; children: React.ReactNode }) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">{props.title}</CardTitle>
      </CardHeader>
      <CardContent>{props.children}</CardContent>
    </Card>
  );
}

function Donut(props: {
  segments: Array<{ name: string; value: number; color: string }>;
  centerValue: string;
  centerLabel: string;
}) {
  const total = props.segments.reduce((s, seg) => s + seg.value, 0);
  const data = total > 0 ? props.segments.filter((s) => s.value > 0) : [{ name: "None", value: 1, color: "#e5e7eb" }];

  return (
    <div className="flex items-center gap-3">
      <div className="relative h-[120px] w-[120px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={56}
              paddingAngle={2}
              stroke="none"
            >
              {data.map((seg, i) => (
                <Cell key={i} fill={seg.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold leading-none tabular-nums">{props.centerValue}</span>
          <span className="mt-0.5 text-[10px] text-muted-foreground">{props.centerLabel}</span>
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        {props.segments.map((seg) => (
          <div key={seg.name} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: seg.color }} />
            <span className="flex-1 truncate text-muted-foreground">{seg.name}</span>
            <span className="font-semibold tabular-nums">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AttendeeAnalyticsPanels(props: {
  summary: EventAttendeesSummary | null;
  analytics: EventAttendeesAnalytics | null;
}) {
  const s = props.summary;
  const a = props.analytics;
  if (!s || !a) return null;

  const currency = a.currency;
  const maxPlant = Math.max(1, ...a.mostRequestedPlants.map((p) => p.count));

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      <PanelCard title="Registrations by day">
        {a.registrationsByDay.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">No registrations yet.</p>
        ) : (
          <div className="h-[132px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={a.registrationsByDay} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10 }}
                  interval="preserveStartEnd"
                />
                <Bar dataKey="count" fill="hsl(142 71% 45%)" radius={[3, 3, 0, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </PanelCard>

      <PanelCard title="Top bonus card buyers">
        {a.topBonusBuyers.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">No bonus card buyers yet.</p>
        ) : (
          <ul className="space-y-2">
            {a.topBonusBuyers.map((b) => (
              <li key={b.registrationId} className="flex items-center justify-between gap-2 text-xs">
                <span className="min-w-0 flex-1 truncate font-medium">{b.name}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">{b.count} cards</span>
                <span className="w-14 shrink-0 text-right font-semibold tabular-nums">
                  {money(b.spend, currency)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </PanelCard>

      <PanelCard title="Most requested plants">
        {a.mostRequestedPlants.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">No plant requests yet.</p>
        ) : (
          <ul className="space-y-2.5">
            {a.mostRequestedPlants.map((p) => (
              <li key={p.name} className="space-y-1">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">{p.count} requests</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${(p.count / maxPlant) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </PanelCard>

      <PanelCard title="Check-in progress">
        <Donut
          segments={[
            { name: "Checked in", value: s.checkedIn, color: "hsl(142 71% 45%)" },
            { name: "Pending", value: s.notCheckedIn, color: "hsl(38 92% 50%)" },
            { name: "No-shows", value: s.noShows, color: "hsl(0 84% 60%)" },
          ]}
          centerValue={String(s.checkedIn)}
          centerLabel="Checked in"
        />
      </PanelCard>

      <PanelCard title="Attendee types">
        <Donut
          segments={[
            { name: "VIP", value: a.attendeeTypes.vip, color: "hsl(340 82% 52%)" },
            { name: "Returning", value: a.attendeeTypes.returning, color: "hsl(217 91% 60%)" },
            { name: "New", value: a.attendeeTypes.new, color: "hsl(258 90% 66%)" },
          ]}
          centerValue={String(s.totalAttendees)}
          centerLabel="Total"
        />
      </PanelCard>
    </div>
  );
}
