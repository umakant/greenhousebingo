"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { LMS_EVENT_BINGO_DIFFICULTIES } from "@/lib/lms-events/event-detail-content";

type AddRoundDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  onSaved: () => void;
};

export function AddRoundDialog(props: AddRoundDialogProps) {
  const [name, setName] = React.useState("");
  const [pattern, setPattern] = React.useState("");
  const [difficulty, setDifficulty] = React.useState<string>("Easy");
  const [prizeLabel, setPrizeLabel] = React.useState("");
  const [prizeCost, setPrizeCost] = React.useState<number | null>(null);
  const [prizeRetail, setPrizeRetail] = React.useState<number | null>(null);
  const [scheduledDate, setScheduledDate] = React.useState("");
  const [scheduledTime, setScheduledTime] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (props.open) {
      setName("");
      setPattern("");
      setDifficulty("Easy");
      setPrizeLabel("");
      setPrizeCost(null);
      setPrizeRetail(null);
      setScheduledDate("");
      setScheduledTime("");
    }
  }, [props.open]);

  async function submit() {
    if (!name.trim() || !pattern.trim()) {
      toast.error("Round name and pattern / rule are required.");
      return;
    }
    let scheduledAtIso: string | null = null;
    if (scheduledDate) {
      const parsed = new Date(`${scheduledDate}T${scheduledTime || "00:00"}`);
      if (Number.isNaN(parsed.getTime())) {
        toast.error("Scheduled time is invalid.");
        return;
      }
      scheduledAtIso = parsed.toISOString();
    } else if (scheduledTime) {
      toast.error("Please pick a scheduled date for the time you entered.");
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
            name: name.trim(),
            pattern: pattern.trim(),
            difficulty,
            assignedPrize: prizeLabel.trim(),
            prizeCost: prizeCost,
            prizeRetailValue: prizeRetail,
            scheduledAt: scheduledAtIso,
          }),
        },
      );
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string };
      if (!res.ok || !data?.ok) {
        toast.error(data?.message ?? "Could not add round.");
        return;
      }
      toast.success("Round added.");
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
          <SheetTitle>Add Round</SheetTitle>
          <SheetDescription>
            Adds a new bingo round to the end of this event&apos;s schedule.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label>Round Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Traditional Bingo"
            />
          </div>

          <div className="space-y-2">
            <Label>Pattern / Rule</Label>
            <Textarea
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              rows={2}
              placeholder="e.g. Any line — horizontal, vertical, or diagonal"
            />
          </div>

          <div className="space-y-2">
            <Label>Difficulty</Label>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LMS_EVENT_BINGO_DIFFICULTIES.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Scheduled Date</Label>
              <DatePickerInput
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                placeholder="Pick a date"
              />
            </div>
            <div className="space-y-2">
              <Label>Scheduled Time</Label>
              <Input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Prize</Label>
            <Input
              value={prizeLabel}
              onChange={(e) => setPrizeLabel(e.target.value)}
              placeholder="e.g. Golden Pothos"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Prize Cost</Label>
              <CurrencyInput
                value={prizeCost}
                onChange={setPrizeCost}
                showSymbol
                allowEmpty
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Retail Value</Label>
              <CurrencyInput
                value={prizeRetail}
                onChange={setPrizeRetail}
                showSymbol
                allowEmpty
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        <SheetFooter className="mt-6 gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => props.onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={submitting} onClick={() => void submit()}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Round"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
