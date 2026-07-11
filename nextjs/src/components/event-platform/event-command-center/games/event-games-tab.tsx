"use client";

import * as React from "react";
import { ListOrdered, Loader2, Plus, Trophy } from "lucide-react";
import { toast } from "sonner";

import {
  GameWinnerPanels,
  GamesRoundTimeline,
  GamesSummaryCards,
} from "@/components/event-platform/event-command-center/games/games-panels";
import { AddRoundDialog } from "@/components/event-platform/event-command-center/games/add-round-dialog";
import { LiveGameControls } from "@/components/event-platform/event-command-center/games/live-game-controls";
import { RecordWinnerDialog } from "@/components/event-platform/event-command-center/games/record-winner-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableActionButton } from "@/components/ui/table-action-button";
import type { EventGamesOverview } from "@/lib/event-platform/bingo-rounds/bingo-round-types";
import { EVENT_BINGO_ROUND_STATUS_LABELS } from "@/lib/event-platform/bingo-rounds/bingo-round-constants";
import { cn } from "@/lib/utils";

const ROUNDS_COLLAPSED = 6;

function statusClass(status: string) {
  if (status === "completed") return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
  if (status === "in_progress") return "bg-sky-500/15 text-sky-700 dark:text-sky-400";
  if (status === "paused") return "bg-amber-500/15 text-amber-700 dark:text-amber-400";
  if (status === "cancelled") return "bg-red-500/15 text-red-700 dark:text-red-400";
  if (status === "winner_verification") return "bg-violet-500/15 text-violet-700 dark:text-violet-400";
  return "bg-muted text-muted-foreground";
}

function formatTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function EventGamesTab(props: { eventId: string }) {
  const [overview, setOverview] = React.useState<EventGamesOverview | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [selectedRoundId, setSelectedRoundId] = React.useState<string | null>(null);
  const [recordOpen, setRecordOpen] = React.useState(false);
  const [addRoundOpen, setAddRoundOpen] = React.useState(false);
  const [showAllRounds, setShowAllRounds] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/event-platform/events/${encodeURIComponent(props.eventId)}/games`, {
      credentials: "include",
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as {
      ok?: boolean;
      overview?: EventGamesOverview;
      message?: string;
    };
    if (!res.ok || !data?.ok || !data.overview) {
      toast.error(data?.message ?? "Could not load games.");
      setOverview(null);
    } else {
      setOverview(data.overview);
      setSelectedRoundId((prev) => prev ?? data.overview!.currentRoundId ?? data.overview!.rounds[0]?.id ?? null);
    }
    setLoading(false);
  }, [props.eventId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const rounds = overview?.rounds ?? [];
  const winners = overview?.winners ?? [];
  const canManage = overview?.canManageGames ?? false;

  const selectedRound =
    rounds.find((r) => r.id === selectedRoundId) ??
    rounds.find((r) => r.status === "in_progress") ??
    rounds[0] ??
    null;

  const visibleRounds = showAllRounds ? rounds : rounds.slice(0, ROUNDS_COLLAPSED);

  async function verifyWinner(winnerId: string) {
    if (!canManage) return;
    const res = await fetch(
      `/api/event-platform/events/${encodeURIComponent(props.eventId)}/games/winners/${encodeURIComponent(winnerId)}`,
      {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      },
    );
    const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string };
    if (!res.ok || !data?.ok) {
      toast.error(data?.message ?? "Verification failed.");
      return;
    }
    toast.success("Winner verified.");
    void load();
  }

  if (loading && !overview) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading games…
      </div>
    );
  }

  if (!loading && rounds.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-12 text-center">
        <Trophy className="h-8 w-8 text-muted-foreground" />
        <div>
          <p className="font-medium">No bingo rounds configured</p>
          <p className="text-sm text-muted-foreground">
            Edit the event to add games from the bingo games library.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <GamesSummaryCards summary={overview?.summary ?? null} loading={loading} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
              <div>
                <CardTitle className="text-base">Live Controls</CardTitle>
                <p className="text-xs text-muted-foreground">Manage the current round in real time</p>
              </div>
              {canManage ? (
                <Button type="button" size="sm" onClick={() => setRecordOpen(true)}>
                  <Trophy className="mr-1.5 h-4 w-4" />
                  Record winner
                </Button>
              ) : null}
            </CardHeader>
            <CardContent>
              <LiveGameControls
                eventId={props.eventId}
                round={selectedRound}
                canManage={canManage}
                onAction={load}
                onRecordWinner={() => setRecordOpen(true)}
              />
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
              <div>
                <CardTitle className="text-base">Game Rounds</CardTitle>
                <p className="text-xs text-muted-foreground">All rounds for this event</p>
              </div>
              {canManage ? (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setAddRoundOpen(true)}
                  >
                    <Plus className="mr-1.5 h-4 w-4" />
                    Add round
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => toast.info("Edit the event to reorder bingo rounds.")}
                  >
                    <ListOrdered className="mr-1.5 h-4 w-4" />
                    Edit order
                  </Button>
                </div>
              ) : null}
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Round</TableHead>
                    <TableHead className="whitespace-nowrap">Game</TableHead>
                    <TableHead className="hidden min-w-[160px] md:table-cell">Pattern / Rule</TableHead>
                    <TableHead className="hidden min-w-[130px] lg:table-cell">Scheduled</TableHead>
                    <TableHead className="whitespace-nowrap">Status</TableHead>
                    <TableHead className="whitespace-nowrap">Winners</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleRounds.map((round) => {
                    const pendingWinnerId =
                      round.primaryWinner && !round.primaryWinner.verified ? round.primaryWinner.id : null;
                    return (
                      <TableRow
                        key={round.id}
                        className={cn("cursor-pointer", selectedRound?.id === round.id && "bg-muted/50")}
                        onClick={() => setSelectedRoundId(round.id)}
                      >
                        <TableCell className="font-medium tabular-nums">{round.roundNumber}</TableCell>
                        <TableCell className="max-w-[160px] truncate font-medium">{round.name}</TableCell>
                        <TableCell className="hidden max-w-[200px] truncate text-muted-foreground md:table-cell">
                          {round.pattern}
                        </TableCell>
                        <TableCell className="hidden whitespace-nowrap text-xs text-muted-foreground lg:table-cell">
                          {formatTime(round.scheduledAt)}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("border-0 text-[10px] capitalize", statusClass(round.status))}>
                            {EVENT_BINGO_ROUND_STATUS_LABELS[round.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {round.primaryWinner ? (
                            <div className="flex items-center gap-1.5">
                              <Trophy className="h-3.5 w-3.5 text-amber-500" />
                              <span className="max-w-[110px] truncate text-sm">
                                {round.primaryWinner.attendeeName}
                              </span>
                              {round.winnerCount > 1 ? (
                                <span className="text-xs text-muted-foreground">+{round.winnerCount - 1}</span>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <TableActionButton
                            label="Actions"
                            items={[
                              { label: "Select round", onSelect: () => setSelectedRoundId(round.id) },
                              ...(canManage
                                ? [
                                    {
                                      label: "Record winner",
                                      onSelect: () => {
                                        setSelectedRoundId(round.id);
                                        setRecordOpen(true);
                                      },
                                    },
                                  ]
                                : []),
                              ...(canManage && pendingWinnerId
                                ? [
                                    {
                                      label: "Verify winner",
                                      onSelect: () => void verifyWinner(pendingWinnerId),
                                    },
                                  ]
                                : []),
                              { label: "View activity", onSelect: () => toast.info("See the Activity tab.") },
                            ]}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
            {rounds.length > ROUNDS_COLLAPSED ? (
              <div className="border-t p-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-muted-foreground"
                  onClick={() => setShowAllRounds((v) => !v)}
                >
                  {showAllRounds ? "Show fewer rounds" : `View all rounds (${rounds.length})`}
                </Button>
              </div>
            ) : null}
          </Card>
        </div>

        <div className="space-y-4">
          <GamesRoundTimeline rounds={rounds} currentRoundId={overview?.currentRoundId ?? selectedRoundId} />
        </div>
      </div>

      <GameWinnerPanels rounds={rounds} winners={winners} />

      {canManage ? (
        <>
          <RecordWinnerDialog
            open={recordOpen}
            onOpenChange={setRecordOpen}
            eventId={props.eventId}
            rounds={rounds}
            defaultRoundId={selectedRound?.id}
            onSaved={load}
          />
          <AddRoundDialog
            open={addRoundOpen}
            onOpenChange={setAddRoundOpen}
            eventId={props.eventId}
            onSaved={load}
          />
        </>
      ) : null}
    </div>
  );
}
