"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import type { EventPlantDto } from "@/lib/event-platform/event-plants/event-plant-types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

type PlantRequestDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  registrationId?: string | null;
  registrationLabel?: string | null;
  plants: EventPlantDto[];
  defaultPlantId?: string | null;
  onSaved: () => void;
};

export function PlantRequestDialog(props: PlantRequestDialogProps) {
  const [registrationId, setRegistrationId] = React.useState(props.registrationId ?? "");
  const [plantId, setPlantId] = React.useState(props.defaultPlantId ?? "free_text");
  const [freeText, setFreeText] = React.useState("");
  const [priority, setPriority] = React.useState("1");
  const [notes, setNotes] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (props.open) {
      setRegistrationId(props.registrationId ?? "");
      setPlantId(props.defaultPlantId ?? "free_text");
    }
  }, [props.open, props.registrationId, props.defaultPlantId]);

  async function submit() {
    if (!registrationId.trim()) {
      toast.error("Registration ID is required.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(
        `/api/event-platform/events/${encodeURIComponent(props.eventId)}/plants/requests`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            registrationId: registrationId.trim(),
            eventPlantId: plantId !== "free_text" ? plantId : null,
            requestedPlantName: plantId === "free_text" ? freeText.trim() || null : null,
            priority: Number.parseInt(priority, 10) || 1,
            notes: notes.trim() || null,
          }),
        },
      );
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string };
      if (!res.ok || !data?.ok) {
        toast.error(data?.message ?? "Could not save request.");
        return;
      }
      toast.success("Plant request saved.");
      props.onOpenChange(false);
      props.onSaved();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Plant request</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {props.registrationLabel ? (
            <p className="text-sm text-muted-foreground">Attendee: {props.registrationLabel}</p>
          ) : (
            <div className="space-y-2">
              <Label>Registration ID</Label>
              <Input value={registrationId} onChange={(e) => setRegistrationId(e.target.value)} />
            </div>
          )}
          <div className="space-y-2">
            <Label>Plant</Label>
            <Select value={plantId} onValueChange={setPlantId}>
              <SelectTrigger>
                <SelectValue placeholder="Select plant" />
              </SelectTrigger>
              <SelectContent>
                {props.plants
                  .filter((p) => p.status !== "removed")
                  .map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                <SelectItem value="free_text">Other (free text)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {plantId === "free_text" ? (
            <div className="space-y-2">
              <Label>Requested plant name</Label>
              <Input value={freeText} onChange={(e) => setFreeText(e.target.value)} />
            </div>
          ) : null}
          <div className="space-y-2">
            <Label>Priority</Label>
            <Input type="number" min={1} max={5} value={priority} onChange={(e) => setPriority(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => props.onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={busy} onClick={() => void submit()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
