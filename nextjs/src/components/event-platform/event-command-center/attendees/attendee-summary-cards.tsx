"use client";

import {
  CalendarClock,
  Crown,
  Leaf,
  Sparkles,
  Ticket,
  Trophy,
  UserCheck,
} from "lucide-react";

import type {
  EventAttendeesAnalytics,
  EventAttendeesSummary,
} from "@/lib/event-platform/attendees/event-attendees-types";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function money(value: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

type StatItem = { label: string; value: string; tone?: string };

function StatGroup(props: {
  title: string;
  accent: string;
  stats: StatItem[];
}) {
  return (
    <div className="flex-1 rounded-xl border bg-card p-4 shadow-sm">
      <p className={cn("mb-3 text-[11px] font-semibold uppercase tracking-wide", props.accent)}>
        {props.title}
      </p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        {props.stats.map((stat) => (
          <div key={stat.label} className="min-w-0">
            <p className={cn("text-2xl font-bold leading-none tracking-tight tabular-nums", stat.tone)}>
              {stat.value}
            </p>
            <p className="mt-1 truncate text-[11px] text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CapacityRing({ percent }: { percent: number }) {
  const size = 96;
  const stroke = 9;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, Math.round(percent)));
  const offset = circumference * (1 - clamped / 100);
  const toneClass =
    clamped >= 100 ? "stroke-amber-500" : clamped >= 75 ? "stroke-emerald-500" : "stroke-sky-500";

  return (
    <div className="flex shrink-0 flex-col items-center justify-center gap-1.5 rounded-xl border bg-card p-4 shadow-sm">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            className="stroke-muted"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={cn("transition-all duration-700", toneClass)}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold tabular-nums">{clamped}%</span>
        </div>
      </div>
      <span className="text-center text-[11px] font-medium text-muted-foreground">Capacity filled</span>
    </div>
  );
}

export function AttendeeSummaryPanels(props: {
  summary: EventAttendeesSummary | null;
  analytics: EventAttendeesAnalytics | null;
  netProfit?: number | null;
  loading?: boolean;
}) {
  const s = props.summary;
  const a = props.analytics;

  if (props.loading || !s || !a) {
    return (
      <div className="flex flex-col gap-3 lg:flex-row">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-[116px] flex-1 animate-pulse rounded-xl border bg-muted/40" />
        ))}
        <div className="h-[116px] w-[136px] animate-pulse rounded-xl border bg-muted/40" />
      </div>
    );
  }

  const currency = a.currency;
  const bingoWinners = s.bingoWinners === "not_configured" ? "—" : String(s.bingoWinnerCount ?? 0);
  const fillPercent = a.capacity && a.capacity > 0 ? (s.totalAttendees / a.capacity) * 100 : null;

  return (
    <div className="flex flex-col gap-3 xl:flex-row">
      <StatGroup
        title="Attendance"
        accent="text-emerald-600 dark:text-emerald-400"
        stats={[
          { label: "Registered", value: String(s.totalAttendees) },
          { label: "Checked In", value: String(s.checkedIn), tone: "text-emerald-600 dark:text-emerald-400" },
          { label: "Pending", value: String(s.notCheckedIn), tone: "text-amber-600 dark:text-amber-400" },
          { label: "Seats Left", value: a.seatsLeft != null ? String(a.seatsLeft) : "—" },
        ]}
      />
      <StatGroup
        title="Revenue"
        accent="text-sky-600 dark:text-sky-400"
        stats={[
          { label: "Revenue", value: money(a.revenue, currency), tone: "text-foreground" },
          {
            label: "Profit",
            value: props.netProfit != null ? money(props.netProfit, currency) : "—",
            tone: "text-emerald-600 dark:text-emerald-400",
          },
          { label: "Bonus Buyers", value: String(s.bonusCardBuyers) },
        ]}
      />
      <StatGroup
        title="Engagement"
        accent="text-violet-600 dark:text-violet-400"
        stats={[
          { label: "Winners", value: bingoWinners },
          { label: "Plant Requests", value: String(a.plantRequestsTotal) },
          { label: "VIP Guests", value: String(a.vipGuests) },
        ]}
      />
      {fillPercent != null ? <CapacityRing percent={fillPercent} /> : null}
    </div>
  );
}

type Insight = { icon: React.ReactNode; text: string; iconClass: string };

export function AttendeeQuickInsights(props: {
  summary: EventAttendeesSummary | null;
  analytics: EventAttendeesAnalytics | null;
}) {
  const s = props.summary;
  const a = props.analytics;
  if (!s || !a) return null;

  const insights: Insight[] = [];

  if (s.notCheckedIn > 0) {
    insights.push({
      icon: <UserCheck className="h-4 w-4" />,
      iconClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
      text: `${s.notCheckedIn} guests still need check-in`,
    });
  }
  if (s.bonusCardBuyers > 0) {
    insights.push({
      icon: <Ticket className="h-4 w-4" />,
      iconClass: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
      text: `${s.bonusCardBuyers} guests purchased bonus cards`,
    });
  }
  const topPlant = a.mostRequestedPlants[0];
  if (topPlant) {
    insights.push({
      icon: <Leaf className="h-4 w-4" />,
      iconClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
      text: `${topPlant.name} requested by ${topPlant.count} attendees`,
    });
  }
  if (s.bingoWinners !== "not_configured" && (s.bingoWinnerCount ?? 0) > 0) {
    insights.push({
      icon: <Trophy className="h-4 w-4" />,
      iconClass: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
      text: `${s.bingoWinnerCount} bingo winners so far`,
    });
  }
  const topSpender = a.topBonusBuyers[0];
  if (topSpender && topSpender.spend > 0) {
    insights.push({
      icon: <Sparkles className="h-4 w-4" />,
      iconClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
      text: `Top customer spent ${money(topSpender.spend, a.currency)}`,
    });
  }
  if (a.vipGuests > 0) {
    insights.push({
      icon: <Crown className="h-4 w-4" />,
      iconClass: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
      text: `${a.vipGuests} VIP guests attending`,
    });
  }

  if (insights.length === 0) return null;

  return (
    <Card className="shadow-sm">
      <CardContent className="flex items-center gap-4 overflow-x-auto p-3">
        <div className="flex shrink-0 items-center gap-1.5 pr-1 text-sm font-semibold">
          <CalendarClock className="h-4 w-4 text-muted-foreground" />
          Quick Insights
        </div>
        <div className="flex flex-1 flex-wrap gap-2">
          {insights.map((insight, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-xs font-medium"
            >
              <span className={cn("flex h-6 w-6 items-center justify-center rounded-md", insight.iconClass)}>
                {insight.icon}
              </span>
              <span className="whitespace-nowrap">{insight.text}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
