"use client";

import * as React from "react";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  DollarSign,
  FileText,
  Leaf,
  Loader2,
  LogOut,
  Megaphone,
  Pause,
  Play,
  PlayCircle,
  QrCode,
  RefreshCw,
  Sprout,
  Star,
  Ticket,
  Trophy,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { LiveCheckInPanel } from "@/components/event-platform/event-command-center/live/live-check-in-panel";
import {
  AnnouncementDialog,
  BonusCardSaleDialog,
  IncidentDialog,
  WalkInDialog,
} from "@/components/event-platform/event-command-center/live/live-mode-dialogs";
import { RecordWinnerDialog } from "@/components/event-platform/event-command-center/games/record-winner-dialog";
import { Button } from "@/components/ui/button";
import type { EventBingoRoundAction } from "@/lib/event-platform/bingo-rounds/bingo-round-constants";
import type { EventBingoRoundDto } from "@/lib/event-platform/bingo-rounds/bingo-round-types";
import type { LiveEventSnapshot } from "@/lib/event-platform/live-event/live-event-types";
import { cn } from "@/lib/utils";

function useLiveClock() {
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

function fmtTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function initials(text: string): string {
  const parts = text.trim().split(/\s+/).slice(0, 2);
  const out = parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
  return out || "•";
}

type EventLiveModeProps = {
  eventId: string;
  onExit: () => void;
};

export function EventLiveMode(props: EventLiveModeProps) {
  const now = useLiveClock();
  const [snapshot, setSnapshot] = React.useState<LiveEventSnapshot | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [lastUpdated, setLastUpdated] = React.useState<Date | null>(null);
  const [winnerOpen, setWinnerOpen] = React.useState(false);
  const [walkInOpen, setWalkInOpen] = React.useState(false);
  const [bonusOpen, setBonusOpen] = React.useState(false);
  const [announceOpen, setAnnounceOpen] = React.useState(false);
  const [incidentOpen, setIncidentOpen] = React.useState(false);

  const load = React.useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    const res = await fetch(`/api/event-platform/events/${encodeURIComponent(props.eventId)}/live`, {
      credentials: "include",
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; snapshot?: LiveEventSnapshot; message?: string };
    if (!res.ok || !data?.ok || !data.snapshot) {
      if (!silent) toast.error(data?.message ?? "Could not refresh live data.");
    } else {
      setSnapshot(data.snapshot);
      setLastUpdated(new Date());
    }
    setLoading(false);
    setRefreshing(false);
  }, [props.eventId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    const ms = snapshot?.pollIntervalMs ?? 15000;
    const id = window.setInterval(() => void load(true), ms);
    return () => window.clearInterval(id);
  }, [load, snapshot?.pollIntervalMs]);

  if (loading && !snapshot) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-muted">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-muted p-6">
        <p className="text-muted-foreground">Live mode unavailable.</p>
        <Button onClick={props.onExit}>Exit Live Mode</Button>
      </div>
    );
  }

  const perms = snapshot.permissions;
  const round = snapshot.currentRound;
  const totalRounds = snapshot.rounds.length;
  const roundValue =
    snapshot.kpis.currentRoundNumber != null
      ? `${snapshot.kpis.currentRoundNumber} of ${totalRounds || "—"}`
      : totalRounds
        ? `— of ${totalRounds}`
        : "—";
  const remainingPct =
    snapshot.kpis.registered > 0 && snapshot.kpis.remaining != null
      ? Math.round((snapshot.kpis.remaining / snapshot.kpis.registered) * 100)
      : null;
  const currencyFmt = (n: number) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: snapshot.currency || "USD",
      maximumFractionDigits: 0,
    }).format(n);

  const kpis: Array<{
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string | number;
    tint: string;
    suffix?: string;
  }> = [
    { icon: Users, label: "Registered", value: snapshot.kpis.registered, tint: "bg-blue-100 text-blue-600" },
    { icon: UserCheck, label: "Checked in", value: snapshot.kpis.checkedIn, tint: "bg-green-100 text-green-600" },
    {
      icon: Clock,
      label: "Remaining",
      value: snapshot.kpis.remaining ?? "—",
      tint: "bg-amber-100 text-amber-600",
      suffix: remainingPct != null ? `${remainingPct}%` : undefined,
    },
    { icon: UserPlus, label: "Walk-ins", value: snapshot.kpis.walkIns, tint: "bg-violet-100 text-violet-600" },
    {
      icon: DollarSign,
      label: "Sold today",
      value: currencyFmt(snapshot.kpis.ticketsSoldToday),
      tint: "bg-emerald-100 text-emerald-600",
    },
    { icon: Star, label: "Bonus sold", value: snapshot.kpis.bonusCardsSoldToday, tint: "bg-yellow-100 text-yellow-600" },
    { icon: PlayCircle, label: "Round", value: roundValue, tint: "bg-sky-100 text-sky-600" },
    { icon: Trophy, label: "Winners", value: snapshot.kpis.winners, tint: "bg-orange-100 text-orange-600" },
    { icon: Leaf, label: "Plants left", value: snapshot.kpis.plantsRemaining, tint: "bg-green-100 text-green-600" },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-muted">
      {/* Header */}
      <header className="shrink-0 border-b bg-card px-3 py-2.5 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-600 text-white shadow-sm">
                <Sprout className="h-5 w-5" />
              </div>
              <div className="hidden leading-none sm:block">
                <p className="text-[11px] font-semibold tracking-wide text-green-700">THE SOCIAL</p>
                <p className="text-[11px] font-semibold tracking-wide text-green-700">GREENHOUSE</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-600 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
              </span>
              Live Mode
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-bold sm:text-base">{snapshot.eventName}</h1>
              <p className="truncate text-xs text-muted-foreground">
                {new Date(snapshot.startsAt).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}
                {" · "}
                {snapshot.venueName ?? "No venue"}
                {" · Host: "}
                {snapshot.hostName ?? "—"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium capitalize">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              {snapshot.eventStatus.replace(/_/g, " ")}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={props.onExit}
            >
              <LogOut className="h-4 w-4" />
              Exit Live Mode
            </Button>
          </div>
        </div>

        {/* KPI strip */}
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-9">
          {kpis.map((k) => {
            const Icon = k.icon;
            return (
              <div key={k.label} className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2">
                <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", k.tint)}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="truncate text-base font-bold leading-none tabular-nums">{k.value}</p>
                    {k.suffix ? (
                      <span className="rounded bg-amber-100 px-1 text-[10px] font-semibold text-amber-700">{k.suffix}</span>
                    ) : null}
                  </div>
                  <p className="mt-1 truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {k.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4">
        <div className="grid gap-3 sm:gap-4 lg:grid-cols-[1fr_1.15fr_0.95fr]">
          <div className="flex flex-col gap-3 sm:gap-4">
            <CurrentGameCard
              snapshot={snapshot}
              eventId={props.eventId}
              onRefresh={() => void load()}
            />
            <RecentWinnersCard snapshot={snapshot} />
          </div>

          <CheckInCard snapshot={snapshot} eventId={props.eventId} onRefresh={() => void load()} />

          <div className="flex flex-col gap-3 sm:gap-4">
            <RoundScheduleCard snapshot={snapshot} />
            <StaffActivityCard snapshot={snapshot} />
          </div>
        </div>
      </div>

      {/* Action bar */}
      <footer className="shrink-0 border-t bg-card px-3 py-2.5 sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <ActionPill icon={UserPlus} label="Walk-in" tint="text-green-600" disabled={!perms.manageBookings} onClick={() => setWalkInOpen(true)} />
          <ActionPill icon={Star} label="Bonus cards" tint="text-yellow-500" disabled={!perms.managePayments} onClick={() => setBonusOpen(true)} />
          <ActionPill icon={Trophy} label="Record winner" tint="text-orange-500" disabled={!perms.manageGames} onClick={() => setWinnerOpen(true)} />
          <ActionPill icon={Megaphone} label="Announce" tint="text-blue-600" disabled={!perms.sendAnnouncements} onClick={() => setAnnounceOpen(true)} />
          <ActionPill icon={FileText} label="Incident note" tint="text-muted-foreground" disabled={!perms.addIncidents} onClick={() => setIncidentOpen(true)} />

          <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              Live mode: <span className="font-semibold text-foreground">ON</span>
            </span>
            <span>
              Auto refresh: <span className="font-semibold text-foreground">ON</span>
            </span>
            <span className="flex items-center gap-1.5">
              <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
              Last updated: {fmtTime(lastUpdated)}
            </span>
          </div>
        </div>
      </footer>

      <RecordWinnerDialog
        open={winnerOpen}
        onOpenChange={setWinnerOpen}
        eventId={props.eventId}
        rounds={snapshot.rounds}
        defaultRoundId={round?.id}
        onSaved={() => void load()}
      />
      <WalkInDialog open={walkInOpen} onOpenChange={setWalkInOpen} eventId={props.eventId} snapshot={snapshot} onSaved={() => void load()} />
      <BonusCardSaleDialog open={bonusOpen} onOpenChange={setBonusOpen} eventId={props.eventId} snapshot={snapshot} onSaved={() => void load()} />
      <AnnouncementDialog open={announceOpen} onOpenChange={setAnnounceOpen} eventId={props.eventId} onSaved={() => void load()} />
      <IncidentDialog open={incidentOpen} onOpenChange={setIncidentOpen} eventId={props.eventId} onSaved={() => void load()} />
    </div>
  );
}

function ActionPill(props: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  tint: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  const Icon = props.icon;
  return (
    <button
      type="button"
      disabled={props.disabled}
      onClick={props.onClick}
      className="inline-flex items-center gap-2 rounded-xl border bg-card px-3.5 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Icon className={cn("h-4 w-4", props.tint)} />
      {props.label}
    </button>
  );
}

/* ------------------------------- Current game ------------------------------ */

async function postRoundAction(eventId: string, roundId: string, action: EventBingoRoundAction) {
  const res = await fetch(
    `/api/event-platform/events/${encodeURIComponent(eventId)}/games/rounds/${encodeURIComponent(roundId)}/actions`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    },
  );
  const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string };
  if (!res.ok || !data?.ok) throw new Error(data?.message ?? "Action failed.");
}

function DarkButton(props: {
  variant?: "solid" | "ghost";
  disabled?: boolean;
  busy?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  onClick: () => void;
}) {
  const Icon = props.icon;
  return (
    <button
      type="button"
      disabled={props.disabled || props.busy}
      onClick={props.onClick}
      className={cn(
        "inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        props.variant === "ghost"
          ? "border border-white/25 bg-white/10 text-white hover:bg-white/20"
          : "bg-white text-green-900 hover:bg-white/90",
      )}
    >
      {props.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon ? <Icon className="h-4 w-4" /> : null}
      {props.children}
    </button>
  );
}

function CurrentGameCard(props: { snapshot: LiveEventSnapshot; eventId: string; onRefresh: () => void }) {
  const round = props.snapshot.currentRound;
  const next = props.snapshot.nextRound;
  const canManage = props.snapshot.permissions.manageGames;
  const [busy, setBusy] = React.useState(false);

  const run = React.useCallback(
    async (roundId: string, action: EventBingoRoundAction, successMsg: string) => {
      setBusy(true);
      try {
        await postRoundAction(props.eventId, roundId, action);
        toast.success(successMsg);
        props.onRefresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Action failed.");
      } finally {
        setBusy(false);
      }
    },
    [props],
  );

  const inProgress = round?.status === "in_progress";
  const paused = round?.status === "paused";
  const startable = round && ["scheduled", "ready"].includes(round.status);

  return (
    <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-green-900 to-green-800 p-4 text-white shadow-sm sm:p-5">
      <span
        className={cn(
          "inline-flex items-center rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider",
          round ? "bg-white/15 text-white" : "bg-white/10 text-white/70",
        )}
      >
        {inProgress ? "In Progress" : paused ? "Paused" : round ? round.status.replace(/_/g, " ") : "Idle"}
      </span>

      {round ? (
        <>
          <h2 className="mt-3 text-xl font-bold leading-tight">
            Round {round.roundNumber}: {round.name}
          </h2>
          <p className="mt-1 text-sm text-white/70">{round.pattern || "Bingo round in progress"}</p>

          <div className="mt-3 flex flex-wrap gap-2">
            {round.difficulty ? (
              <span className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs">
                <span className="block text-[10px] uppercase tracking-wide text-white/50">Game type</span>
                <span className="font-semibold capitalize">{round.difficulty}</span>
              </span>
            ) : null}
            {round.assignedPrize ? (
              <span className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs">
                <span className="block text-[10px] uppercase tracking-wide text-white/50">Prize</span>
                <span className="font-semibold">{round.assignedPrize}</span>
              </span>
            ) : null}
          </div>

          {canManage ? (
            <div className="mt-4 space-y-2">
              {inProgress ? (
                <DarkButton variant="ghost" icon={Pause} busy={busy} onClick={() => void run(round.id, "pause", "Round paused.")}>
                  Pause Round
                </DarkButton>
              ) : null}
              {startable ? (
                <DarkButton icon={Play} busy={busy} onClick={() => void run(round.id, "start", "Round started.")}>
                  Start Round
                </DarkButton>
              ) : null}
              {paused ? (
                <DarkButton icon={Play} busy={busy} onClick={() => void run(round.id, "resume", "Round resumed.")}>
                  Resume Round
                </DarkButton>
              ) : null}
              {!["completed", "cancelled"].includes(round.status) ? (
                <DarkButton
                  variant={inProgress || paused ? "solid" : "ghost"}
                  icon={CheckCircle2}
                  busy={busy}
                  onClick={() => void run(round.id, "complete", "Round completed.")}
                >
                  Complete Round
                </DarkButton>
              ) : null}
            </div>
          ) : null}
        </>
      ) : (
        <>
          <h2 className="mt-3 text-xl font-bold leading-tight">No active round</h2>
          <p className="mt-1 text-sm text-white/70">No round in progress.</p>
          {next && canManage ? (
            <div className="mt-4">
              <DarkButton icon={Play} busy={busy} onClick={() => void run(next.id, "start", "Next round started.")}>
                Start next game
              </DarkButton>
            </div>
          ) : null}
        </>
      )}

      {next ? (
        <div className="mt-4 rounded-xl border border-white/15 bg-white/5 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-white/50">Upcoming Round</p>
          <div className="mt-1 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-white/60" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                Round {next.roundNumber}: {next.name}
              </p>
              <p className="truncate text-xs text-white/60">{next.pattern || next.assignedPrize || "Coming up next"}</p>
            </div>
          </div>
        </div>
      ) : null}

      {props.snapshot.inventoryWarnings.length > 0 ? (
        <div className="mt-4 space-y-1.5">
          {props.snapshot.inventoryWarnings.map((w) => (
            <div
              key={w.id}
              className={cn(
                "flex gap-2 rounded-lg border border-white/15 bg-white/5 p-2 text-xs",
                w.severity === "critical" && "border-red-300/50 bg-red-500/15",
              )}
            >
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-300" />
              <div>
                <p className="font-medium">{w.title}</p>
                <p className="text-white/60">{w.message}</p>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

/* ------------------------------ Recent winners ----------------------------- */

function RecentWinnersCard(props: { snapshot: LiveEventSnapshot }) {
  const roundNameByNumber = new Map(props.snapshot.rounds.map((r: EventBingoRoundDto) => [r.roundNumber, r.name]));
  const winners = props.snapshot.recentWinners.slice(0, 6);

  return (
    <section className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Recent Winners</h3>
        <span className="text-xs font-medium text-green-600">View all</span>
      </div>
      <ul className="mt-3 space-y-2">
        {winners.map((w) => {
          const rn = roundNameByNumber.get(w.roundNumber);
          return (
            <li key={w.id} className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <Trophy className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{w.attendeeName}</p>
                <p className="truncate text-xs text-muted-foreground">
                  Round {w.roundNumber}
                  {rn ? `: ${rn}` : ""}
                </p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">{fmtTime(w.createdAt)}</span>
            </li>
          );
        })}
        {winners.length === 0 ? <li className="text-sm text-muted-foreground">No winners yet.</li> : null}
      </ul>
    </section>
  );
}

/* -------------------------------- Check-in --------------------------------- */

function CheckInCard(props: { snapshot: LiveEventSnapshot; eventId: string; onRefresh: () => void }) {
  return (
    <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Check-in</h3>
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">QR scan, ticket lookup, name, phone, or manual check-in</p>

      <div className="mt-4">
        <LiveCheckInPanel
          eventId={props.eventId}
          canCheckIn={props.snapshot.permissions.checkIn}
          canUndoCheckIn={props.snapshot.permissions.undoCheckIn}
          onSuccess={props.onRefresh}
        />
      </div>

      <div className="mt-5 border-t pt-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-muted-foreground">Recent check-ins</p>
          <span className="text-xs font-medium text-green-600">View all</span>
        </div>
        <ul className="mt-2 space-y-1.5">
          {props.snapshot.recentCheckIns.slice(0, 6).map((r) => (
            <li key={r.registrationId} className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                <span className="truncate text-sm font-medium">{r.name}</span>
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">{fmtTime(r.checkedInAt)}</span>
            </li>
          ))}
          {props.snapshot.recentCheckIns.length === 0 ? (
            <li className="text-sm text-muted-foreground">No check-ins yet.</li>
          ) : null}
        </ul>
      </div>
    </section>
  );
}

/* ----------------------------- Round schedule ------------------------------ */

function scheduleMeta(status: "upcoming" | "current" | "past" | "unknown") {
  switch (status) {
    case "past":
      return { icon: CheckCircle2, iconClass: "text-green-500", label: "Past", labelClass: "text-muted-foreground" };
    case "current":
      return { icon: PlayCircle, iconClass: "text-green-600", label: "In Progress", labelClass: "text-green-600 font-medium" };
    default:
      return { icon: Circle, iconClass: "text-muted-foreground/40", label: "Upcoming", labelClass: "text-muted-foreground" };
  }
}

/** Timeline `time` may be an ISO timestamp or an already-formatted label; normalize to a short time. */
function formatScheduleTime(value: string | null): string | null {
  if (!value) return null;
  if (/\d{4}-\d{2}-\d{2}T/.test(value) || /\d{4}-\d{2}-\d{2}\d/.test(value)) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  return value;
}

function RoundScheduleCard(props: { snapshot: LiveEventSnapshot }) {
  return (
    <section className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Round Schedule</h3>
        <span className="text-xs font-medium text-green-600">View full timeline</span>
      </div>
      <ul className="mt-3 space-y-0.5">
        {props.snapshot.schedule.map((item) => {
          const meta = scheduleMeta(item.status);
          const Icon = meta.icon;
          const isCurrent = item.status === "current";
          const time = formatScheduleTime(item.time);
          return (
            <li
              key={item.id}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-2 py-1.5",
                isCurrent && "bg-green-50",
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", meta.iconClass)} />
              <span className={cn("min-w-0 flex-1 truncate text-sm", isCurrent && "font-semibold")}>{item.label}</span>
              {time ? <span className="shrink-0 text-xs text-muted-foreground">{time}</span> : null}
              <span className={cn("w-20 shrink-0 text-right text-xs", meta.labelClass)}>{meta.label}</span>
            </li>
          );
        })}
        {props.snapshot.schedule.length === 0 ? (
          <li className="px-2 py-1.5 text-sm text-muted-foreground">No schedule available.</li>
        ) : null}
      </ul>
    </section>
  );
}

/* ------------------------------ Staff activity ----------------------------- */

const STAFF_AVATAR_TINTS = [
  "bg-blue-100 text-blue-600",
  "bg-green-100 text-green-600",
  "bg-violet-100 text-violet-600",
  "bg-amber-100 text-amber-600",
  "bg-rose-100 text-rose-600",
  "bg-sky-100 text-sky-600",
];

function StaffActivityCard(props: { snapshot: LiveEventSnapshot }) {
  return (
    <section className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Staff Activity</h3>
        <span className="text-xs font-medium text-green-600">View all</span>
      </div>
      <ul className="mt-3 space-y-2.5">
        {props.snapshot.staffActivity.slice(0, 8).map((a, i) => (
          <li key={a.id} className="flex items-start gap-2.5">
            <div
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                STAFF_AVATAR_TINTS[i % STAFF_AVATAR_TINTS.length],
              )}
            >
              {initials(a.title)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-snug">
                <span className="font-medium">{a.title}</span>
                {a.detail ? <span className="text-muted-foreground"> {a.detail}</span> : null}
              </p>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">{fmtTime(a.at)}</span>
          </li>
        ))}
        {props.snapshot.staffActivity.length === 0 ? (
          <li className="text-sm text-muted-foreground">No staff activity yet.</li>
        ) : null}
      </ul>
    </section>
  );
}
