"use client";

import * as React from "react";
import {
  AlertTriangle,
  Clock,
  Loader2,
  LogOut,
  Megaphone,
  Pause,
  Play,
  QrCode,
  Ticket,
  Trophy,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";

import { LiveCheckInPanel } from "@/components/event-platform/event-command-center/live/live-check-in-panel";
import {
  AnnouncementDialog,
  BonusCardSaleDialog,
  IncidentDialog,
  WalkInDialog,
} from "@/components/event-platform/event-command-center/live/live-mode-dialogs";
import { LiveGameControls } from "@/components/event-platform/event-command-center/games/live-game-controls";
import { RecordWinnerDialog } from "@/components/event-platform/event-command-center/games/record-winner-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
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

function formatElapsed(startIso: string | null | undefined, now: Date): string {
  if (!startIso) return "—";
  const start = new Date(startIso).getTime();
  if (Number.isNaN(start)) return "—";
  const sec = Math.max(0, Math.floor((now.getTime() - start) / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function KpiChip(props: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border bg-card px-3 py-2 text-center min-w-[72px]">
      <p className="text-lg font-bold tabular-nums leading-none">{props.value}</p>
      <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">{props.label}</p>
    </div>
  );
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
  const [winnerOpen, setWinnerOpen] = React.useState(false);
  const [walkInOpen, setWalkInOpen] = React.useState(false);
  const [bonusOpen, setBonusOpen] = React.useState(false);
  const [announceOpen, setAnnounceOpen] = React.useState(false);
  const [incidentOpen, setIncidentOpen] = React.useState(false);
  const [mobilePanel, setMobilePanel] = React.useState<"checkin" | "game" | "schedule">("game");

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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background p-6">
        <p className="text-muted-foreground">Live mode unavailable.</p>
        <Button onClick={props.onExit}>Exit Live Mode</Button>
      </div>
    );
  }

  const perms = snapshot.permissions;
  const round = snapshot.currentRound;
  const elapsed = formatElapsed(round?.actualStartAt, now);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <header className="shrink-0 border-b bg-card px-3 py-2 sm:px-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold sm:text-lg">{snapshot.eventName}</h1>
            <p className="text-xs text-muted-foreground">
              {now.toLocaleDateString()} · {now.toLocaleTimeString()} · {snapshot.venueName ?? "No venue"} · Host: {snapshot.hostName ?? "—"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="capitalize">{snapshot.eventStatus.replace(/_/g, " ")}</Badge>
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={props.onExit}>
              <LogOut className="h-4 w-4" />
              Exit Live Mode
            </Button>
          </div>
        </div>
        <ScrollArea className="mt-2 w-full whitespace-nowrap">
          <div className="flex gap-2 pb-1">
            <KpiChip label="Registered" value={snapshot.kpis.registered} />
            <KpiChip label="Checked in" value={snapshot.kpis.checkedIn} />
            <KpiChip label="Remaining" value={snapshot.kpis.remaining ?? "—"} />
            <KpiChip label="Walk-ins" value={snapshot.kpis.walkIns} />
            <KpiChip label="Sold today" value={snapshot.kpis.ticketsSoldToday} />
            <KpiChip label="Bonus today" value={snapshot.kpis.bonusCardsSoldToday} />
            <KpiChip label="Round" value={snapshot.kpis.currentRoundNumber ?? "—"} />
            <KpiChip label="Winners" value={snapshot.kpis.winners} />
            <KpiChip label="Plants left" value={snapshot.kpis.plantsRemaining} />
          </div>
        </ScrollArea>
      </header>

      <div className="hidden flex-1 overflow-hidden lg:grid lg:grid-cols-[1fr_1.1fr_0.9fr] lg:gap-3 lg:p-3">
        <GamePanel
          snapshot={snapshot}
          eventId={props.eventId}
          elapsed={elapsed}
          onRefresh={() => void load()}
          onRecordWinner={() => setWinnerOpen(true)}
        />
        <CheckInPanel snapshot={snapshot} eventId={props.eventId} onRefresh={() => void load()} />
        <SidePanel snapshot={snapshot} />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden lg:hidden">
        <div className="flex border-b">
          {(["game", "checkin", "schedule"] as const).map((p) => (
            <button
              key={p}
              type="button"
              className={cn(
                "flex-1 py-2 text-xs font-medium capitalize",
                mobilePanel === p ? "border-b-2 border-primary text-primary" : "text-muted-foreground",
              )}
              onClick={() => setMobilePanel(p)}
            >
              {p === "checkin" ? "Check-in" : p}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {mobilePanel === "game" ? (
            <GamePanel snapshot={snapshot} eventId={props.eventId} elapsed={elapsed} onRefresh={() => void load()} onRecordWinner={() => setWinnerOpen(true)} />
          ) : null}
          {mobilePanel === "checkin" ? (
            <CheckInPanel snapshot={snapshot} eventId={props.eventId} onRefresh={() => void load()} />
          ) : null}
          {mobilePanel === "schedule" ? <SidePanel snapshot={snapshot} /> : null}
        </div>
      </div>

      <footer className="shrink-0 border-t bg-card p-2 lg:hidden">
        <div className="grid grid-cols-4 gap-1">
          <ActionBtn icon={QrCode} label="Scan" disabled={!perms.checkIn} onClick={() => setMobilePanel("checkin")} />
          <ActionBtn icon={UserPlus} label="Walk-in" disabled={!perms.manageBookings} onClick={() => setWalkInOpen(true)} />
          <ActionBtn icon={Ticket} label="Bonus" disabled={!perms.managePayments} onClick={() => setBonusOpen(true)} />
          <ActionBtn icon={Trophy} label="Winner" disabled={!perms.manageGames} onClick={() => setWinnerOpen(true)} />
        </div>
      </footer>

      <div className="hidden shrink-0 border-t bg-muted/30 px-3 py-2 lg:block">
        <div className="flex flex-wrap gap-2">
          <Button size="lg" className="h-12 min-w-[120px]" disabled={!perms.manageBookings} onClick={() => setWalkInOpen(true)}>
            <UserPlus className="mr-2 h-5 w-5" /> Walk-in
          </Button>
          <Button size="lg" variant="secondary" className="h-12 min-w-[120px]" disabled={!perms.managePayments} onClick={() => setBonusOpen(true)}>
            <Ticket className="mr-2 h-5 w-5" /> Bonus cards
          </Button>
          <Button size="lg" variant="outline" className="h-12 min-w-[120px]" disabled={!perms.manageGames} onClick={() => setWinnerOpen(true)}>
            <Trophy className="mr-2 h-5 w-5" /> Record winner
          </Button>
          <Button size="lg" variant="outline" className="h-12 min-w-[120px]" disabled={!perms.sendAnnouncements} onClick={() => setAnnounceOpen(true)}>
            <Megaphone className="mr-2 h-5 w-5" /> Announce
          </Button>
          <Button size="lg" variant="ghost" className="h-12" disabled={!perms.addIncidents} onClick={() => setIncidentOpen(true)}>
            Incident note
          </Button>
        </div>
      </div>

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

function StartNextRoundButton(props: { eventId: string; roundId: string; canManage: boolean; onDone: () => void }) {
  const [busy, setBusy] = React.useState(false);
  return (
    <Button
      className="h-11 w-full"
      disabled={!props.canManage || busy}
      onClick={() => {
        setBusy(true);
        void fetch(
          `/api/event-platform/events/${encodeURIComponent(props.eventId)}/games/rounds/${encodeURIComponent(props.roundId)}/actions`,
          { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "start" }) },
        )
          .then(async (res) => {
            const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string };
            if (!res.ok || !data?.ok) toast.error(data?.message ?? "Could not start next round.");
            else { toast.success("Next round started."); props.onDone(); }
          })
          .finally(() => setBusy(false));
      }}
    >
      {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
      Start next game
    </Button>
  );
}

function ActionBtn(props: { icon: React.ComponentType<{ className?: string }>; label: string; disabled?: boolean; onClick: () => void }) {
  const Icon = props.icon;
  return (
    <Button type="button" variant="outline" className="h-14 flex-col gap-0.5 px-1 text-[10px]" disabled={props.disabled} onClick={props.onClick}>
      <Icon className="h-5 w-5" />
      {props.label}
    </Button>
  );
}

function GamePanel(props: {
  snapshot: LiveEventSnapshot;
  eventId: string;
  elapsed: string;
  onRefresh: () => void;
  onRecordWinner: () => void;
}) {
  const round = props.snapshot.currentRound;
  const next = props.snapshot.nextRound;

  return (
    <Card className="flex h-full flex-col overflow-hidden shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Current game</CardTitle>
        <CardDescription>
          {round ? `Round ${round.roundNumber} · ${round.status.replace(/_/g, " ")}` : "No active round"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 space-y-3 overflow-y-auto">
        {round ? (
          <>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">Name</span><p className="font-medium">{round.name}</p></div>
              <div><span className="text-muted-foreground">Pattern</span><p className="font-medium">{round.pattern || "—"}</p></div>
              <div><span className="text-muted-foreground">Prize</span><p className="font-medium">{round.assignedPrize || "—"}</p></div>
              <div className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-muted-foreground" /><span className="font-mono">{props.elapsed}</span></div>
            </div>
            <LiveGameControls
              eventId={props.eventId}
              round={round}
              canManage={props.snapshot.permissions.manageGames}
              onAction={props.onRefresh}
              onRecordWinner={props.onRecordWinner}
            />
            {next && round.status === "completed" ? (
              <StartNextRoundButton eventId={props.eventId} roundId={next.id} canManage={props.snapshot.permissions.manageGames} onDone={props.onRefresh} />
            ) : null}
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">No round in progress.</p>
            {next ? (
              <StartNextRoundButton
                eventId={props.eventId}
                roundId={next.id}
                canManage={props.snapshot.permissions.manageGames}
                onDone={props.onRefresh}
              />
            ) : null}
          </>
        )}
        {props.snapshot.inventoryWarnings.length > 0 && (
          <div className="space-y-1">
            {props.snapshot.inventoryWarnings.map((w) => (
              <div key={w.id} className={cn("flex gap-2 rounded-md border p-2 text-xs", w.severity === "critical" && "border-red-300 bg-red-50 dark:bg-red-950/20")}>
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <div><p className="font-medium">{w.title}</p><p className="text-muted-foreground">{w.message}</p></div>
              </div>
            ))}
          </div>
        )}
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Recent winners</p>
          <ul className="space-y-1 text-sm">
            {props.snapshot.recentWinners.slice(0, 5).map((w) => (
              <li key={w.id} className="flex justify-between gap-2 rounded border px-2 py-1.5">
                <span>R{w.roundNumber} · {w.attendeeName}</span>
                <Badge variant={w.verified ? "default" : "outline"} className="text-[10px]">{w.verified ? "Verified" : "Pending"}</Badge>
              </li>
            ))}
            {props.snapshot.recentWinners.length === 0 ? <li className="text-muted-foreground">No winners yet.</li> : null}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

function CheckInPanel(props: { snapshot: LiveEventSnapshot; eventId: string; onRefresh: () => void }) {
  return (
    <Card className="flex h-full flex-col overflow-hidden shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Check-in</CardTitle>
        <CardDescription>QR scan, ticket lookup, name, phone, manual check-in</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        <LiveCheckInPanel
          eventId={props.eventId}
          canCheckIn={props.snapshot.permissions.checkIn}
          canUndoCheckIn={props.snapshot.permissions.undoCheckIn}
          onSuccess={props.onRefresh}
        />
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Recent check-ins</p>
          <ul className="max-h-32 space-y-1 overflow-y-auto text-sm">
            {props.snapshot.recentCheckIns.map((r) => (
              <li key={r.registrationId} className="flex justify-between gap-2 border-b py-1">
                <span className="truncate font-medium">{r.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{new Date(r.checkedInAt).toLocaleTimeString()}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Still expected ({props.snapshot.expectedAttendees.length})</p>
          <ul className="max-h-28 space-y-1 overflow-y-auto text-sm">
            {props.snapshot.expectedAttendees.map((r) => (
              <li key={r.registrationId} className="truncate text-muted-foreground">{r.name}</li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

function SidePanel(props: { snapshot: LiveEventSnapshot }) {
  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto">
      <Card className="shadow-sm">
        <CardHeader className="pb-2"><CardTitle className="text-base">Schedule</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-1 text-sm">
            {props.snapshot.schedule.map((item) => (
              <li key={item.id} className={cn("flex justify-between gap-2 rounded px-2 py-1", item.status === "current" && "bg-primary/10 font-medium")}>
                <span>{item.label}</span>
                <span className="text-xs text-muted-foreground capitalize">{item.status}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <Card className="shadow-sm">
        <CardHeader className="pb-2"><CardTitle className="text-base">Staff activity</CardTitle></CardHeader>
        <CardContent>
          <ul className="max-h-40 space-y-1 overflow-y-auto text-xs">
            {props.snapshot.staffActivity.map((a) => (
              <li key={a.id} className="border-b py-1">
                <span className="font-medium capitalize">{a.title}</span>
                {a.detail ? <span className="text-muted-foreground"> · {a.detail}</span> : null}
                <span className="block text-[10px] text-muted-foreground">{new Date(a.at).toLocaleTimeString()}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      {props.snapshot.incidents.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-base">Incidents</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2 text-xs">
              {props.snapshot.incidents.slice(0, 5).map((i) => (
                <li key={i.id} className="rounded border p-2">
                  <Badge variant="outline" className="mb-1 text-[10px]">{i.severity}</Badge>
                  <p>{i.description}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
