"use client";

import * as React from "react";
import { Loader2, Pause, Play, Square, Trophy } from "lucide-react";
import { toast } from "sonner";

import type { EventBingoRoundDto } from "@/lib/event-platform/bingo-rounds/bingo-round-types";
import type { EventBingoRoundAction } from "@/lib/event-platform/bingo-rounds/bingo-round-constants";
import { Button } from "@/components/ui/button";

type LiveGameControlsProps = {
  eventId: string;
  round: EventBingoRoundDto | null;
  canManage: boolean;
  onAction: () => void;
  onRecordWinner: () => void;
};

export function LiveGameControls(props: LiveGameControlsProps) {
  const [busy, setBusy] = React.useState(false);
  const round = props.round;

  async function runAction(action: EventBingoRoundAction) {
    if (!round || !props.canManage) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/event-platform/events/${encodeURIComponent(props.eventId)}/games/rounds/${encodeURIComponent(round.id)}/actions`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        },
      );
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string };
      if (!res.ok || !data?.ok) {
        toast.error(data?.message ?? "Action failed.");
        return;
      }
      toast.success(`Round ${action.replace(/_/g, " ")}`);
      props.onAction();
    } finally {
      setBusy(false);
    }
  }

  if (!round) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        Select a round or start the next scheduled game.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {props.canManage ? (
        <>
          {["scheduled", "ready", "paused"].includes(round.status) ? (
            <Button type="button" size="sm" disabled={busy} onClick={() => void runAction(round.status === "paused" ? "resume" : "start")}>
              <Play className="mr-1.5 h-4 w-4" />
              {round.status === "paused" ? "Resume" : "Start"}
            </Button>
          ) : null}
          {round.status === "in_progress" ? (
            <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => void runAction("pause")}>
              <Pause className="mr-1.5 h-4 w-4" />
              Pause
            </Button>
          ) : null}
          {!["completed", "cancelled"].includes(round.status) ? (
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={props.onRecordWinner}>
              <Trophy className="mr-1.5 h-4 w-4" />
              Record winner
            </Button>
          ) : null}
          {!["completed", "cancelled"].includes(round.status) ? (
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void runAction("complete")}>
              Complete
            </Button>
          ) : null}
          {!["completed", "cancelled"].includes(round.status) ? (
            <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => void runAction("cancel")}>
              <Square className="mr-1.5 h-4 w-4" />
              Cancel
            </Button>
          ) : null}
        </>
      ) : null}
      {busy ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
    </div>
  );
}
