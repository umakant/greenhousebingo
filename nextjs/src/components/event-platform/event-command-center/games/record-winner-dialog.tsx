"use client";

import * as React from "react";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";

import type { EventAttendeeRow } from "@/lib/event-platform/attendees/event-attendees-types";
import type { EventBingoRoundDto } from "@/lib/event-platform/bingo-rounds/bingo-round-types";
import {
  EVENT_BINGO_CARD_TYPES,
  EVENT_BINGO_CARD_TYPE_LABELS,
} from "@/lib/event-platform/bingo-rounds/bingo-round-constants";
import type { EventBingoCardType } from "@/lib/event-platform/bingo-rounds/bingo-round-constants";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type RecordWinnerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  rounds: EventBingoRoundDto[];
  defaultRoundId?: string | null;
  defaultRegistrationId?: string | null;
  defaultRegistrationLabel?: string | null;
  onSaved: () => void;
};

export function RecordWinnerDialog(props: RecordWinnerDialogProps) {
  const [roundId, setRoundId] = React.useState(props.defaultRoundId ?? "");
  const [search, setSearch] = React.useState(props.defaultRegistrationLabel ?? "");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [attendees, setAttendees] = React.useState<EventAttendeeRow[]>([]);
  const [searchLoading, setSearchLoading] = React.useState(false);
  const [registrationId, setRegistrationId] = React.useState(props.defaultRegistrationId ?? "");
  const [winningCardNumber, setWinningCardNumber] = React.useState("");
  const [cardType, setCardType] = React.useState<EventBingoCardType>("included");
  const [prizeLabel, setPrizeLabel] = React.useState("");
  const [verified, setVerified] = React.useState(false);
  const [notes, setNotes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [validation, setValidation] = React.useState<{ errors: string[]; warnings: string[] } | null>(null);

  const selectedRound = props.rounds.find((r) => r.id === roundId);

  React.useEffect(() => {
    if (props.open && props.defaultRoundId) setRoundId(props.defaultRoundId);
  }, [props.open, props.defaultRoundId]);

  React.useEffect(() => {
    if (props.open && props.defaultRegistrationId) {
      setRegistrationId(props.defaultRegistrationId);
      setSearch(props.defaultRegistrationLabel ?? "");
    }
  }, [props.open, props.defaultRegistrationId, props.defaultRegistrationLabel]);

  React.useEffect(() => {
    if (selectedRound && !prizeLabel) setPrizeLabel(selectedRound.assignedPrize);
  }, [selectedRound, prizeLabel]);

  React.useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  React.useEffect(() => {
    if (!props.open || debouncedSearch.length < 2) {
      setAttendees([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      setSearchLoading(true);
      const qs = new URLSearchParams({ q: debouncedSearch, pageSize: "10" });
      const res = await fetch(
        `/api/event-platform/events/${encodeURIComponent(props.eventId)}/attendees?${qs}`,
        { credentials: "include" },
      );
      const data = (await res.json().catch(() => null)) as { ok?: boolean; rows?: EventAttendeeRow[] };
      if (!cancelled) {
        setAttendees(data?.ok ? (data.rows ?? []) : []);
        setSearchLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [props.open, props.eventId, debouncedSearch]);

  async function submit(force = false) {
    if (!roundId || !registrationId || !winningCardNumber.trim()) {
      toast.error("Round, attendee, and card number are required.");
      return;
    }
    setSubmitting(true);
    setValidation(null);
    try {
      const res = await fetch(
        `/api/event-platform/events/${encodeURIComponent(props.eventId)}/games/winners`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roundInstanceId: roundId,
            registrationId,
            winningCardNumber: winningCardNumber.trim(),
            cardType,
            prizeLabel,
            prizeCost: null,
            prizeRetailValue: null,
            verified,
            notes: notes || null,
            force,
          }),
        },
      );
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
        validation?: { errors: string[]; warnings: string[] };
      };
      if (!res.ok || !data?.ok) {
        setValidation(data?.validation ?? { errors: [data?.message ?? "Failed"], warnings: [] });
        if (data?.validation?.warnings?.length && !data.validation.errors.length) {
          toast.warning("Review warnings and confirm to proceed.");
        } else {
          toast.error(data?.message ?? "Could not record winner.");
        }
        return;
      }
      toast.success("Winner recorded.");
      props.onSaved();
      props.onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Record winner</SheetTitle>
          <SheetDescription>Validate card and prize before completing the round.</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label>Game round</Label>
            <Select value={roundId} onValueChange={setRoundId}>
              <SelectTrigger>
                <SelectValue placeholder="Select round" />
              </SelectTrigger>
              <SelectContent>
                {props.rounds.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    Round {r.roundNumber}: {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Search attendee</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name, email, or phone…"
                className="pl-9"
              />
            </div>
            {searchLoading ? (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Searching…
              </p>
            ) : null}
            {attendees.length > 0 ? (
              <div className="max-h-32 overflow-y-auto rounded-md border">
                {attendees.map((a) => (
                  <button
                    key={a.registrationId}
                    type="button"
                    className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => {
                      setRegistrationId(a.registrationId);
                      setSearch(a.fullName);
                    }}
                  >
                    <span className="font-medium">{a.fullName}</span>
                    <span className="text-xs text-muted-foreground">{a.email}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Winning card #</Label>
              <Input value={winningCardNumber} onChange={(e) => setWinningCardNumber(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Card type</Label>
              <Select value={cardType} onValueChange={(v) => setCardType(v as EventBingoCardType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_BINGO_CARD_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {EVENT_BINGO_CARD_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Prize</Label>
            <Input value={prizeLabel} onChange={(e) => setPrizeLabel(e.target.value)} />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="verified" checked={verified} onCheckedChange={(v) => setVerified(Boolean(v))} />
            <Label htmlFor="verified">Mark winning card verified</Label>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>

          {validation ? (
            <div
              className={cn(
                "rounded-md border p-3 text-sm",
                validation.errors.length
                  ? "border-destructive/50 bg-destructive/10 text-destructive"
                  : "border-amber-500/50 bg-amber-500/10",
              )}
            >
              {validation.errors.map((e) => (
                <div key={e}>{e}</div>
              ))}
              {validation.warnings.map((w) => (
                <div key={w} className="text-amber-800 dark:text-amber-300">
                  {w}
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <SheetFooter className="mt-6 gap-2 sm:gap-0">
          {validation?.warnings.length && !validation.errors.length ? (
            <Button type="button" variant="secondary" disabled={submitting} onClick={() => void submit(true)}>
              Save with warnings
            </Button>
          ) : null}
          <Button type="button" disabled={submitting} onClick={() => void submit(false)}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Record winner"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
