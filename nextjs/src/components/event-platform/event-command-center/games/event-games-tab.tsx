"use client";



import * as React from "react";

import { Loader2, Trophy } from "lucide-react";

import { toast } from "sonner";



import {

  GamesRoundTimeline,

  GamesSummaryCards,

  WinnerAnalyticsCharts,

} from "@/components/event-platform/event-command-center/games/games-panels";

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

import { EVENT_BINGO_CARD_TYPE_LABELS } from "@/lib/event-platform/bingo-rounds/bingo-round-constants";

import { cn } from "@/lib/utils";



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



function formatMoney(value: number | null) {

  if (value == null) return "—";

  return `$${value.toFixed(2)}`;

}



function checkInLabel(status: string) {

  if (status === "checked_in") return "Checked in";

  if (status === "no_show") return "No show";

  return "Not checked in";

}



export function EventGamesTab(props: { eventId: string }) {

  const [overview, setOverview] = React.useState<EventGamesOverview | null>(null);

  const [loading, setLoading] = React.useState(true);

  const [selectedRoundId, setSelectedRoundId] = React.useState<string | null>(null);

  const [recordOpen, setRecordOpen] = React.useState(false);



  const load = React.useCallback(async () => {

    setLoading(true);

    const res = await fetch(`/api/event-platform/events/${encodeURIComponent(props.eventId)}/games`, {

      credentials: "include",

      cache: "no-store",

    });

    const data = (await res.json().catch(() => null)) as { ok?: boolean; overview?: EventGamesOverview; message?: string };

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

  const selectedRound = rounds.find((r) => r.id === selectedRoundId) ?? rounds.find((r) => r.status === "in_progress") ?? rounds[0] ?? null;



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

          <p className="text-sm text-muted-foreground">Edit the event to add games from the bingo games library.</p>

        </div>

      </div>

    );

  }



  return (

    <div className="space-y-6">

      <GamesSummaryCards summary={overview?.summary ?? null} loading={loading} />



      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">

        <div className="space-y-4">

          <Card className="shadow-sm">

            <CardHeader className="flex flex-row items-center justify-between pb-2">

              <CardTitle className="text-base">Live controls</CardTitle>

              {canManage ? (

                <Button type="button" size="sm" onClick={() => setRecordOpen(true)}>

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

            <CardHeader className="pb-2">

              <CardTitle className="text-base">Game rounds</CardTitle>

            </CardHeader>

            <CardContent className="overflow-x-auto p-0">

              <Table>

                <TableHeader>

                  <TableRow>

                    <TableHead className="whitespace-nowrap">Round</TableHead>

                    <TableHead className="whitespace-nowrap">Game</TableHead>

                    <TableHead className="hidden min-w-[140px] md:table-cell">Pattern</TableHead>

                    <TableHead className="hidden min-w-[120px] lg:table-cell">Scheduled</TableHead>

                    <TableHead className="hidden min-w-[120px] xl:table-cell">Started</TableHead>

                    <TableHead className="hidden min-w-[120px] xl:table-cell">Ended</TableHead>

                    <TableHead className="whitespace-nowrap">Status</TableHead>

                    <TableHead className="hidden min-w-[120px] lg:table-cell">Prize</TableHead>

                    <TableHead className="hidden min-w-[80px] xl:table-cell">Cost</TableHead>

                    <TableHead className="hidden min-w-[100px] xl:table-cell">Winner</TableHead>

                    <TableHead className="hidden min-w-[80px] 2xl:table-cell">Card</TableHead>

                    <TableHead className="hidden min-w-[90px] 2xl:table-cell">Verified</TableHead>

                    <TableHead className="w-12" />

                  </TableRow>

                </TableHeader>

                <TableBody>

                  {rounds.map((round) => (

                    <TableRow

                      key={round.id}

                      className={cn("cursor-pointer", selectedRound?.id === round.id && "bg-muted/50")}

                      onClick={() => setSelectedRoundId(round.id)}

                    >

                      <TableCell className="font-medium tabular-nums">{round.roundNumber}</TableCell>

                      <TableCell className="max-w-[160px] truncate">{round.name}</TableCell>

                      <TableCell className="hidden max-w-[180px] truncate md:table-cell text-muted-foreground">

                        {round.pattern}

                      </TableCell>

                      <TableCell className="hidden whitespace-nowrap text-xs text-muted-foreground lg:table-cell">

                        {formatTime(round.scheduledAt)}

                      </TableCell>

                      <TableCell className="hidden whitespace-nowrap text-xs text-muted-foreground xl:table-cell">

                        {formatTime(round.actualStartAt)}

                      </TableCell>

                      <TableCell className="hidden whitespace-nowrap text-xs text-muted-foreground xl:table-cell">

                        {formatTime(round.actualEndAt)}

                      </TableCell>

                      <TableCell>

                        <Badge className={cn("border-0 text-[10px] capitalize", statusClass(round.status))}>

                          {EVENT_BINGO_ROUND_STATUS_LABELS[round.status]}

                        </Badge>

                      </TableCell>

                      <TableCell className="hidden max-w-[140px] truncate lg:table-cell">{round.assignedPrize}</TableCell>

                      <TableCell className="hidden tabular-nums xl:table-cell">{formatMoney(round.prizeCost)}</TableCell>

                      <TableCell className="hidden max-w-[120px] truncate xl:table-cell">

                        {round.primaryWinner?.attendeeName ?? "—"}

                      </TableCell>

                      <TableCell className="hidden tabular-nums 2xl:table-cell">

                        {round.primaryWinner?.winningCardNumber ?? "—"}

                      </TableCell>

                      <TableCell className="hidden 2xl:table-cell">

                        {round.primaryWinner ? (

                          <Badge variant={round.primaryWinner.verified ? "secondary" : "outline"} className="text-[10px]">

                            {round.primaryWinner.verified ? "Yes" : "Pending"}

                          </Badge>

                        ) : (

                          "—"

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

                            { label: "View activity", onSelect: () => toast.info("See activity log below.") },

                          ]}

                        />

                      </TableCell>

                    </TableRow>

                  ))}

                </TableBody>

              </Table>

            </CardContent>

          </Card>



          <WinnerAnalyticsCharts analytics={overview?.analytics ?? null} />

        </div>



        <div className="space-y-4">

          <GamesRoundTimeline rounds={rounds} currentRoundId={overview?.currentRoundId ?? selectedRoundId} />



          <Card className="shadow-sm">

            <CardHeader className="pb-2">

              <CardTitle className="text-base">Winners</CardTitle>

            </CardHeader>

            <CardContent className="overflow-x-auto p-0">

              {winners.length === 0 ? (

                <p className="p-4 text-sm text-muted-foreground">No winners recorded yet.</p>

              ) : (

                <Table>

                  <TableHeader>

                    <TableRow>

                      <TableHead>Winner</TableHead>

                      <TableHead className="hidden sm:table-cell">Round</TableHead>

                      <TableHead className="hidden md:table-cell">Card</TableHead>

                      <TableHead className="hidden lg:table-cell">Prize</TableHead>

                      <TableHead>Status</TableHead>

                    </TableRow>

                  </TableHeader>

                  <TableBody>

                    {winners.map((w) => (

                      <TableRow key={w.id}>

                        <TableCell>

                          <div>

                            <p className="font-medium">{w.attendeeName}</p>

                            <p className="text-xs text-muted-foreground sm:hidden">

                              R{w.roundNumber} · {EVENT_BINGO_CARD_TYPE_LABELS[w.cardType]}

                            </p>

                            <p className="text-xs text-muted-foreground">{checkInLabel(w.checkInStatus)}</p>

                          </div>

                        </TableCell>

                        <TableCell className="hidden tabular-nums sm:table-cell">{w.roundNumber}</TableCell>

                        <TableCell className="hidden md:table-cell">

                          <span className="tabular-nums">{w.winningCardNumber}</span>

                          <span className="block text-xs text-muted-foreground">

                            {EVENT_BINGO_CARD_TYPE_LABELS[w.cardType]}

                          </span>

                        </TableCell>

                        <TableCell className="hidden max-w-[140px] truncate lg:table-cell">{w.prizeLabel}</TableCell>

                        <TableCell>

                          <div className="flex flex-col gap-1">

                            <Badge variant={w.verified ? "secondary" : "outline"} className="w-fit text-[10px]">

                              {w.verified ? "Verified" : "Pending"}

                            </Badge>

                            {!w.verified && canManage ? (

                              <Button

                                type="button"

                                size="sm"

                                variant="outline"

                                className="h-7 text-xs"

                                onClick={() => void verifyWinner(w.id)}

                              >

                                Verify

                              </Button>

                            ) : null}

                            <span className="text-[10px] text-muted-foreground">

                              {new Date(w.createdAt).toLocaleString(undefined, {

                                month: "short",

                                day: "numeric",

                                hour: "numeric",

                                minute: "2-digit",

                              })}

                            </span>

                          </div>

                        </TableCell>

                      </TableRow>

                    ))}

                  </TableBody>

                </Table>

              )}

            </CardContent>

          </Card>



          {overview?.activity.length ? (

            <Card className="shadow-sm">

              <CardHeader className="pb-2">

                <CardTitle className="text-base">Activity</CardTitle>

              </CardHeader>

              <CardContent className="space-y-2">

                {overview.activity.map((item) => (

                  <div key={item.id} className="text-sm">

                    <p className="font-medium capitalize">{item.title}</p>

                    <p className="text-xs text-muted-foreground">

                      {new Date(item.at).toLocaleString()} · {item.detail}

                    </p>

                  </div>

                ))}

              </CardContent>

            </Card>

          ) : null}

        </div>

      </div>



      {canManage ? (

        <RecordWinnerDialog

          open={recordOpen}

          onOpenChange={setRecordOpen}

          eventId={props.eventId}

          rounds={rounds}

          defaultRoundId={selectedRound?.id}

          onSaved={load}

        />

      ) : null}

    </div>

  );

}


