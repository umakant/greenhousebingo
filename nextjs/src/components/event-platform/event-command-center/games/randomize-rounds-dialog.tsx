"use client";

import * as React from "react";
import { Dices, Loader2, Shuffle } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  randomizeBingoRounds,
  type RandomizedBingoRound,
} from "@/lib/event-platform/bingo-rounds/bingo-pattern-library";
import {
  LMS_EVENT_BINGO_DIFFICULTIES,
  type LmsEventBingoDifficulty,
} from "@/lib/lms-events/event-detail-content";
import { cn } from "@/lib/utils";

type RandomizeRoundsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  onSaved: () => void;
};

type Mode = "same" | "mix";

const DIFFICULTY_STYLES: Record<LmsEventBingoDifficulty, string> = {
  Easy: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
  Medium:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300",
  Hard: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/40 dark:text-orange-300",
  Epic: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-300",
};

const MAX_TOTAL = 50;

function emptyCounts(): Record<LmsEventBingoDifficulty, number> {
  return { Easy: 0, Medium: 0, Hard: 0, Epic: 0 };
}

export function RandomizeRoundsDialog(props: RandomizeRoundsDialogProps) {
  const [mode, setMode] = React.useState<Mode>("same");
  const [totalGames, setTotalGames] = React.useState<string>("10");
  const [sameDifficulty, setSameDifficulty] = React.useState<LmsEventBingoDifficulty>("Easy");
  const [mixCounts, setMixCounts] = React.useState<Record<LmsEventBingoDifficulty, number>>(
    () => ({ Easy: 3, Medium: 3, Hard: 3, Epic: 1 }),
  );
  const [preview, setPreview] = React.useState<RandomizedBingoRound[]>([]);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (props.open) {
      setMode("same");
      setTotalGames("10");
      setSameDifficulty("Easy");
      setMixCounts({ Easy: 3, Medium: 3, Hard: 3, Epic: 1 });
      setPreview([]);
    }
  }, [props.open]);

  const plan = React.useMemo<Record<LmsEventBingoDifficulty, number>>(() => {
    if (mode === "same") {
      const total = Math.max(0, Math.min(MAX_TOTAL, Number.parseInt(totalGames, 10) || 0));
      const counts = emptyCounts();
      counts[sameDifficulty] = total;
      return counts;
    }
    return mixCounts;
  }, [mode, totalGames, sameDifficulty, mixCounts]);

  const totalPlanned = React.useMemo(
    () => LMS_EVENT_BINGO_DIFFICULTIES.reduce((sum, d) => sum + (plan[d] ?? 0), 0),
    [plan],
  );

  function randomize() {
    if (totalPlanned <= 0) {
      toast.error("Choose how many games to generate first.");
      return;
    }
    if (totalPlanned > MAX_TOTAL) {
      toast.error(`You can generate at most ${MAX_TOTAL} games at a time.`);
      return;
    }
    setPreview(randomizeBingoRounds(plan));
  }

  function setMixCount(difficulty: LmsEventBingoDifficulty, value: string) {
    const n = Math.max(0, Math.min(MAX_TOTAL, Number.parseInt(value, 10) || 0));
    setMixCounts((prev) => ({ ...prev, [difficulty]: n }));
  }

  async function create() {
    if (preview.length === 0) {
      toast.error("Click Randomize to generate games first.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/event-platform/events/${encodeURIComponent(props.eventId)}/games/rounds`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rounds: preview.map((r) => ({
              name: r.name,
              pattern: r.pattern,
              difficulty: r.difficulty,
            })),
          }),
        },
      );
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        created?: number;
        message?: string;
      };
      if (!res.ok || !data?.ok) {
        toast.error(data?.message ?? "Could not generate rounds.");
        return;
      }
      toast.success(`Added ${data.created ?? preview.length} randomized rounds.`);
      props.onSaved();
      props.onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Dices className="h-5 w-5 text-primary" />
            Randomize Games
          </SheetTitle>
          <SheetDescription>
            Pick how many games you want and their difficulty mix, then hit Randomize to auto-build
            the round schedule. Prizes can be assigned afterward.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 flex-1 space-y-5">
          <div className="inline-flex rounded-lg border bg-muted/40 p-1 text-sm">
            <button
              type="button"
              onClick={() => setMode("same")}
              className={cn(
                "rounded-md px-3 py-1.5 font-medium transition-colors",
                mode === "same"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Same difficulty
            </button>
            <button
              type="button"
              onClick={() => setMode("mix")}
              className={cn(
                "rounded-md px-3 py-1.5 font-medium transition-colors",
                mode === "mix"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Custom mix
            </button>
          </div>

          {mode === "same" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Number of games</Label>
                <Input
                  type="number"
                  min={1}
                  max={MAX_TOTAL}
                  value={totalGames}
                  onChange={(e) => setTotalGames(e.target.value)}
                  placeholder="10"
                />
              </div>
              <div className="space-y-2">
                <Label>Difficulty</Label>
                <div className="flex flex-wrap gap-2">
                  {LMS_EVENT_BINGO_DIFFICULTIES.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setSameDifficulty(d)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                        sameDifficulty === d
                          ? DIFFICULTY_STYLES[d]
                          : "border-border text-muted-foreground hover:bg-muted",
                      )}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {LMS_EVENT_BINGO_DIFFICULTIES.map((d) => (
                <div key={d} className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Badge variant="outline" className={cn("font-medium", DIFFICULTY_STYLES[d])}>
                      {d}
                    </Badge>
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={MAX_TOTAL}
                    value={mixCounts[d]}
                    onChange={(e) => setMixCount(d, e.target.value)}
                  />
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Total games:{" "}
              <span className="font-semibold text-foreground">{totalPlanned}</span>
            </p>
            <Button type="button" variant="secondary" onClick={randomize}>
              <Shuffle className="mr-1.5 h-4 w-4" />
              {preview.length > 0 ? "Re-randomize" : "Randomize"}
            </Button>
          </div>

          {preview.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Preview — {preview.length} games
              </p>
              <ol className="space-y-1.5">
                {preview.map((r, i) => (
                  <li
                    key={`${r.name}-${i}`}
                    className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2 text-sm"
                  >
                    <span className="w-6 shrink-0 text-center text-xs font-semibold text-muted-foreground tabular-nums">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{r.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{r.pattern}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn("shrink-0 font-medium", DIFFICULTY_STYLES[r.difficulty])}
                    >
                      {r.difficulty}
                    </Badge>
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-10 text-center">
              <Dices className="mb-2 h-8 w-8 text-muted-foreground/60" />
              <p className="text-sm text-muted-foreground">
                Set your game counts above and hit Randomize to preview the schedule.
              </p>
            </div>
          )}
        </div>

        <SheetFooter className="mt-6 gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => props.onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={submitting || preview.length === 0}
            onClick={() => void create()}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              `Create ${preview.length || ""} ${preview.length === 1 ? "round" : "rounds"}`.trim()
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
