"use client";

import { CheckCircle2, Play, Trophy } from "lucide-react";

import type { EventBingoRoundDto } from "@/lib/event-platform/bingo-rounds/bingo-round-types";
import { EVENT_BINGO_ROUND_STATUS_LABELS } from "@/lib/event-platform/bingo-rounds/bingo-round-constants";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function statusClass(status: string) {
  if (status === "completed") return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
  if (status === "in_progress") return "bg-sky-500/15 text-sky-700 dark:text-sky-400";
  if (status === "paused") return "bg-amber-500/15 text-amber-700 dark:text-amber-400";
  if (status === "cancelled") return "bg-red-500/15 text-red-700 dark:text-red-400";
  if (status === "winner_verification") return "bg-violet-500/15 text-violet-700 dark:text-violet-400";
  return "bg-muted text-muted-foreground";
}

export function GamesSummaryCards(props: {
  summary: {
    totalRounds: number;
    completedRounds: number;
    upcomingRounds: number;
    inProgressRounds: number;
    totalWinners: number;
    uniqueWinners: number;
    repeatWinners: number;
    prizesAwarded: number;
    totalPrizeCost: number;
    totalPrizeRetailValue: number;
  } | null;
  loading?: boolean;
}) {
  const s = props.summary;
  if (props.loading || !s) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <Card key={i} className="shadow-sm">
            <CardContent className="h-16 animate-pulse bg-muted/40 p-4" />
          </Card>
        ))}
      </div>
    );
  }

  const items = [
    { label: "Total rounds", value: s.totalRounds },
    { label: "Completed", value: s.completedRounds },
    { label: "Upcoming", value: s.upcomingRounds },
    { label: "In progress", value: s.inProgressRounds },
    { label: "Total winners", value: s.totalWinners },
    { label: "Unique winners", value: s.uniqueWinners },
    { label: "Repeat winners", value: s.repeatWinners },
    { label: "Prizes awarded", value: s.prizesAwarded },
    { label: "Prize cost", value: `$${s.totalPrizeCost.toFixed(2)}` },
    { label: "Retail value", value: `$${s.totalPrizeRetailValue.toFixed(2)}` },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {items.map((item) => (
        <Card key={item.label} className="shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="text-xl font-bold tabular-nums">{item.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function GamesRoundTimeline(props: {
  rounds: EventBingoRoundDto[];
  currentRoundId: string | null;
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Round timeline</CardTitle>
      </CardHeader>
      <CardContent>
        {props.rounds.length === 0 ? (
          <p className="text-sm text-muted-foreground">No rounds configured. Edit the event to add bingo games.</p>
        ) : (
          <ol className="relative space-y-0 border-l border-muted pl-6">
            {props.rounds.map((round) => {
              const isCurrent = round.id === props.currentRoundId;
              const isDone = round.status === "completed";
              return (
                <li key={round.id} className="relative pb-6 last:pb-0">
                  <span
                    className={cn(
                      "absolute -left-[25px] flex h-5 w-5 items-center justify-center rounded-full border-2 bg-background",
                      isCurrent && "border-primary bg-primary text-primary-foreground",
                      isDone && !isCurrent && "border-emerald-500 text-emerald-600",
                      !isDone && !isCurrent && "border-muted-foreground/40",
                    )}
                  >
                    {isDone ? <CheckCircle2 className="h-3 w-3" /> : isCurrent ? <Play className="h-2.5 w-2.5" /> : null}
                  </span>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">
                        Round {round.roundNumber}: {round.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{round.pattern}</p>
                      <p className="mt-1 text-sm">
                        <Trophy className="mr-1 inline h-3.5 w-3.5" />
                        {round.assignedPrize}
                      </p>
                      {round.primaryWinner ? (
                        <p className="text-xs text-emerald-700 dark:text-emerald-400">
                          Winner: {round.primaryWinner.attendeeName}
                        </p>
                      ) : null}
                    </div>
                    <Badge className={cn("border-0 capitalize", statusClass(round.status))}>
                      {EVENT_BINGO_ROUND_STATUS_LABELS[round.status] ?? round.status}
                    </Badge>
                  </div>
                  {round.scheduledAt ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Scheduled {new Date(round.scheduledAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

export function WinnerAnalyticsCharts(props: {
  analytics: {
    winsByCardType: Array<{ label: string; count: number }>;
    winsByTicketTier: Array<{ label: string; count: number }>;
    winsByCustomerType: Array<{ label: string; count: number }>;
    newVsReturning: { new: number; returning: number };
    uniqueVsRepeat: { unique: number; repeat: number };
    winsByPattern: Array<{ label: string; count: number }>;
  } | null;
}) {
  if (!props.analytics) return null;
  const a = props.analytics;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <AnalyticsBlock title="Included vs bonus wins" items={a.winsByCardType} />
      <AnalyticsBlock title="Winners by ticket tier" items={a.winsByTicketTier} />
      <AnalyticsBlock title="Winners by customer type" items={a.winsByCustomerType} />
      <AnalyticsBlock
        title="New vs returning winners"
        items={[
          { label: "New", count: a.newVsReturning.new },
          { label: "Returning", count: a.newVsReturning.returning },
        ]}
      />
      <AnalyticsBlock
        title="Unique vs repeat"
        items={[
          { label: "Unique", count: a.uniqueVsRepeat.unique },
          { label: "Repeat entries", count: a.uniqueVsRepeat.repeat },
        ]}
      />
      <AnalyticsBlock title="Winners by pattern" items={a.winsByPattern} className="lg:col-span-2" />
    </div>
  );
}

function AnalyticsBlock(props: {
  title: string;
  items: Array<{ label: string; count: number }>;
  className?: string;
}) {
  const max = Math.max(1, ...props.items.map((i) => i.count));
  return (
    <Card className={cn("shadow-sm", props.className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{props.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {props.items.length === 0 ? (
          <p className="text-xs text-muted-foreground">No winner data yet.</p>
        ) : (
          props.items.map((item) => (
            <div key={item.label}>
              <div className="flex justify-between text-xs">
                <span>{item.label}</span>
                <span className="tabular-nums font-medium">{item.count}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-muted">
                <div
                  className="h-1.5 rounded-full bg-primary"
                  style={{ width: `${Math.round((item.count / max) * 100)}%` }}
                />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
