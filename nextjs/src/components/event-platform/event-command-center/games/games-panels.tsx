"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
} from "recharts";
import {
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Dices,
  Gift,
  Play,
  PlayCircle,
  Repeat,
  Tag,
  Trophy,
  Users,
} from "lucide-react";

import type {
  EventBingoRoundDto,
  EventBingoWinnerDto,
  EventGamesSummary,
} from "@/lib/event-platform/bingo-rounds/bingo-round-types";
import { EVENT_BINGO_ROUND_STATUS_LABELS } from "@/lib/event-platform/bingo-rounds/bingo-round-constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

function money(value: number): string {
  return `$${value.toFixed(2)}`;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function GamesSummaryCards(props: { summary: EventGamesSummary | null; loading?: boolean }) {
  const s = props.summary;
  if (props.loading || !s) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <Card key={i} className="shadow-sm">
            <CardContent className="h-[76px] animate-pulse bg-muted/40 p-4" />
          </Card>
        ))}
      </div>
    );
  }

  const items: Array<{
    label: string;
    value: string | number;
    hint: string;
    icon: React.ReactNode;
    iconClass: string;
  }> = [
    { label: "Total rounds", value: s.totalRounds, hint: "All game rounds", icon: <Dices className="h-4 w-4" />, iconClass: "bg-slate-500/15 text-slate-600 dark:text-slate-300" },
    { label: "Completed", value: s.completedRounds, hint: "Rounds finished", icon: <CheckCircle2 className="h-4 w-4" />, iconClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
    { label: "Upcoming", value: s.upcomingRounds, hint: "Scheduled or waiting", icon: <CalendarClock className="h-4 w-4" />, iconClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
    { label: "In progress", value: s.inProgressRounds, hint: "Currently active", icon: <PlayCircle className="h-4 w-4" />, iconClass: "bg-sky-500/15 text-sky-600 dark:text-sky-400" },
    { label: "Total winners", value: s.totalWinners, hint: "Across all rounds", icon: <Trophy className="h-4 w-4" />, iconClass: "bg-violet-500/15 text-violet-600 dark:text-violet-400" },
    { label: "Unique winners", value: s.uniqueWinners, hint: "Different players", icon: <Users className="h-4 w-4" />, iconClass: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400" },
    { label: "Repeat winners", value: s.repeatWinners, hint: "Won multiple rounds", icon: <Repeat className="h-4 w-4" />, iconClass: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400" },
    { label: "Prizes awarded", value: s.prizesAwarded, hint: "Total prizes given", icon: <Gift className="h-4 w-4" />, iconClass: "bg-rose-500/15 text-rose-600 dark:text-rose-400" },
    { label: "Prize cost", value: money(s.totalPrizeCost), hint: "Total prize cost", icon: <CircleDollarSign className="h-4 w-4" />, iconClass: "bg-orange-500/15 text-orange-600 dark:text-orange-400" },
    { label: "Retail value", value: money(s.totalPrizeRetailValue), hint: "Total retail value", icon: <Tag className="h-4 w-4" />, iconClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {items.map((item) => (
        <Card key={item.label} className="shadow-sm">
          <CardContent className="flex items-start justify-between gap-2 p-3 sm:p-4">
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
              <p className="text-xl font-bold tabular-nums tracking-tight">{item.value}</p>
              <p className="text-[11px] text-muted-foreground">{item.hint}</p>
            </div>
            <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", item.iconClass)}>
              {item.icon}
            </span>
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
  const [expanded, setExpanded] = React.useState(false);
  const COLLAPSED = 4;
  const visible = expanded ? props.rounds : props.rounds.slice(0, COLLAPSED);
  const hasMore = props.rounds.length > COLLAPSED;

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <div>
          <CardTitle className="text-base">Round Timeline</CardTitle>
          <p className="text-xs text-muted-foreground">Track progress of all game rounds</p>
        </div>
        {hasMore ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "Collapse" : "View full timeline"}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        {props.rounds.length === 0 ? (
          <p className="text-sm text-muted-foreground">No rounds configured. Edit the event to add bingo games.</p>
        ) : (
          <>
            <ol className="relative space-y-0 border-l border-muted pl-6">
              {visible.map((round) => {
                const isCurrent = round.id === props.currentRoundId;
                const isDone = round.status === "completed";
                return (
                  <li key={round.id} className="relative pb-5 last:pb-0">
                    <span
                      className={cn(
                        "absolute -left-[25px] flex h-5 w-5 items-center justify-center rounded-full border-2 bg-background",
                        isCurrent && "border-sky-500 bg-sky-500 text-white",
                        isDone && !isCurrent && "border-emerald-500 text-emerald-600",
                        !isDone && !isCurrent && "border-muted-foreground/40",
                      )}
                    >
                      {isDone ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : isCurrent ? (
                        <Play className="h-2.5 w-2.5" />
                      ) : null}
                    </span>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium">
                          Round {round.roundNumber}: {round.name}
                        </p>
                        <p className="text-xs text-muted-foreground">{round.pattern}</p>
                        {round.primaryWinner ? (
                          <p className="mt-0.5 text-xs">
                            <span className="text-muted-foreground">Winner: </span>
                            <span className="font-medium text-emerald-700 dark:text-emerald-400">
                              {round.primaryWinner.attendeeName}
                            </span>
                          </p>
                        ) : null}
                        <p className="text-xs">
                          <span className="text-muted-foreground">Prize: </span>
                          <span className="text-amber-600 dark:text-amber-400">{round.assignedPrize}</span>
                        </p>
                      </div>
                      <Badge className={cn("border-0 capitalize", statusClass(round.status))}>
                        {EVENT_BINGO_ROUND_STATUS_LABELS[round.status] ?? round.status}
                      </Badge>
                    </div>
                  </li>
                );
              })}
            </ol>
            {hasMore ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-2 w-full text-xs text-muted-foreground"
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? "Show less" : "Show more"}
              </Button>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

/** Bottom analytics row: winners by round, prize distribution, top winners. */
export function GameWinnerPanels(props: {
  rounds: EventBingoRoundDto[];
  winners: EventBingoWinnerDto[];
}) {
  const byRound = props.rounds
    .slice()
    .sort((a, b) => a.roundNumber - b.roundNumber)
    .map((r) => ({ label: `R${r.roundNumber}`, count: r.winnerCount }));

  // Prize distribution — plants vs. other, by retail value.
  const OTHER_RE = /gift|card|cash|voucher|credit|coupon|merch|ticket/i;
  let plantsValue = 0;
  let otherValue = 0;
  for (const r of props.rounds) {
    const value = r.prizeRetailValue ?? 0;
    if (value <= 0) continue;
    if (OTHER_RE.test(r.assignedPrize)) otherValue += value;
    else plantsValue += value;
  }
  const totalPrizeValue = plantsValue + otherValue;
  const distribution = [
    { name: "Plants", value: Math.round(plantsValue * 100) / 100, color: "hsl(142 71% 45%)" },
    { name: "Other", value: Math.round(otherValue * 100) / 100, color: "hsl(217 19% 75%)" },
  ];

  // Top winners — aggregate by attendee.
  const winnerMap = new Map<string, { name: string; wins: number; value: number }>();
  for (const w of props.winners) {
    const key = w.registrationId || w.attendeeName;
    const entry = winnerMap.get(key) ?? { name: w.attendeeName, wins: 0, value: 0 };
    entry.wins += 1;
    entry.value += w.prizeRetailValue ?? 0;
    winnerMap.set(key, entry);
  }
  const topWinners = [...winnerMap.values()]
    .sort((a, b) => b.wins - a.wins || b.value - a.value)
    .slice(0, 5);

  const rankColor = ["text-amber-500", "text-slate-400", "text-orange-600"];

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Winners by Round</CardTitle>
          <p className="text-xs text-muted-foreground">See how many winners per round</p>
        </CardHeader>
        <CardContent>
          {byRound.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">No rounds yet.</p>
          ) : (
            <div className="h-[150px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byRound} margin={{ top: 16, right: 4, bottom: 0, left: 4 }}>
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <Bar dataKey="count" fill="hsl(142 71% 45%)" radius={[4, 4, 0, 0]} maxBarSize={28}>
                    <LabelList dataKey="count" position="top" className="fill-foreground" fontSize={11} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Prize Distribution</CardTitle>
          <p className="text-xs text-muted-foreground">Total prize retail value</p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className="relative h-[130px] w-[130px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={totalPrizeValue > 0 ? distribution : [{ name: "None", value: 1, color: "#e5e7eb" }]}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={44}
                    outerRadius={62}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {(totalPrizeValue > 0 ? distribution : [{ color: "#e5e7eb" }]).map((seg, i) => (
                      <Cell key={i} fill={seg.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-bold leading-none tabular-nums">{money(totalPrizeValue)}</span>
              </div>
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              {distribution.map((seg) => {
                const pct = totalPrizeValue > 0 ? Math.round((seg.value / totalPrizeValue) * 100) : 0;
                return (
                  <div key={seg.name} className="flex items-center gap-2 text-xs">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: seg.color }} />
                    <span className="flex-1 truncate text-muted-foreground">{seg.name}</span>
                    <span className="font-semibold tabular-nums">{money(seg.value)}</span>
                    <span className="w-9 text-right text-muted-foreground tabular-nums">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Top Winners</CardTitle>
          <p className="text-xs text-muted-foreground">Most wins in this event</p>
        </CardHeader>
        <CardContent>
          {topWinners.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">No winners recorded yet.</p>
          ) : (
            <ul className="space-y-2.5">
              {topWinners.map((w, i) => (
                <li key={w.name + i} className="flex items-center gap-2.5">
                  <span className={cn("w-4 shrink-0 text-center text-sm font-bold tabular-nums", rankColor[i] ?? "text-muted-foreground")}>
                    {i + 1}
                  </span>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold">
                    {initials(w.name)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{w.name}</span>
                  <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                    <Trophy className="h-3 w-3 text-amber-500" />
                    {w.wins} {w.wins === 1 ? "win" : "wins"}
                  </span>
                  <span className="w-14 shrink-0 text-right text-sm font-semibold tabular-nums">
                    {money(w.value)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
