"use client";

import { Leaf, Ticket, Trophy, UserCheck, UserPlus, Users, UserX } from "lucide-react";

import type { EventAttendeesSummary } from "@/lib/event-platform/attendees/event-attendees-types";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function SummaryCard(props: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  iconClass: string;
  muted?: boolean;
}) {
  return (
    <Card className="shadow-sm">
      <CardContent className="flex items-start justify-between gap-2 p-3 sm:p-4">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{props.label}</p>
          <p className={cn("text-xl font-bold tabular-nums tracking-tight", props.muted && "text-muted-foreground")}>
            {props.value}
          </p>
          {props.sub ? <p className="text-[11px] text-muted-foreground">{props.sub}</p> : null}
        </div>
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", props.iconClass)}>
          {props.icon}
        </div>
      </CardContent>
    </Card>
  );
}

export function AttendeeSummaryCards(props: { summary: EventAttendeesSummary | null; loading?: boolean }) {
  const s = props.summary;
  if (props.loading || !s) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 9 }).map((_, i) => (
          <Card key={i} className="shadow-sm">
            <CardContent className="h-[76px] animate-pulse bg-muted/40 p-4" />
          </Card>
        ))}
      </div>
    );
  }

  const walkIns =
    s.walkIns === "not_configured" ? "—" : String(s.walkInCount ?? 0);
  const bingoWinners =
    s.bingoWinners === "not_configured" ? "—" : String(s.bingoWinnerCount ?? 0);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <SummaryCard label="Total attendees" value={String(s.totalAttendees)} icon={<Users className="h-4 w-4" />} iconClass="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" />
      <SummaryCard label="Checked in" value={String(s.checkedIn)} icon={<UserCheck className="h-4 w-4" />} iconClass="bg-sky-500/15 text-sky-700 dark:text-sky-400" />
      <SummaryCard label="Not checked in" value={String(s.notCheckedIn)} icon={<UserX className="h-4 w-4" />} iconClass="bg-amber-500/15 text-amber-700 dark:text-amber-400" />
      <SummaryCard label="New attendees" value={String(s.newAttendees)} icon={<UserPlus className="h-4 w-4" />} iconClass="bg-violet-500/15 text-violet-700 dark:text-violet-400" />
      <SummaryCard label="Returning" value={String(s.returningAttendees)} icon={<Users className="h-4 w-4" />} iconClass="bg-indigo-500/15 text-indigo-700 dark:text-indigo-400" />
      <SummaryCard label="Walk-ins" value={walkIns} sub={s.walkIns === "not_configured" ? "Not configured" : undefined} icon={<Users className="h-4 w-4" />} iconClass="bg-muted text-muted-foreground" muted={s.walkIns === "not_configured"} />
      <SummaryCard label="Bonus-card buyers" value={String(s.bonusCardBuyers)} sub={s.bonusCardEventAverage != null ? `Avg ${s.bonusCardEventAverage} cards` : undefined} icon={<Ticket className="h-4 w-4" />} iconClass="bg-amber-500/15 text-amber-700 dark:text-amber-400" />
      <SummaryCard label="Bingo winners" value={bingoWinners} sub={s.bingoWinners === "not_configured" ? "Not configured" : undefined} icon={<Trophy className="h-4 w-4" />} iconClass="bg-muted text-muted-foreground" muted={s.bingoWinners === "not_configured"} />
      <SummaryCard label="No-shows" value={String(s.noShows)} icon={<Leaf className="h-4 w-4" />} iconClass="bg-red-500/15 text-red-700 dark:text-red-400" />
    </div>
  );
}
