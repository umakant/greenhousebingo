"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

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
import { Textarea } from "@/components/ui/textarea";

type PlantFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  initial?: {
    id?: string;
    name?: string;
    category?: string | null;
    variety?: string | null;
    quantityPurchased?: number;
    unitCost?: number;
    retailValue?: number | null;
    notes?: string | null;
  } | null;
  onSaved: () => void;
};

export function PlantFormDialog(props: PlantFormDialogProps) {
  const [name, setName] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [variety, setVariety] = React.useState("");
  const [qty, setQty] = React.useState("1");
  const [unitCost, setUnitCost] = React.useState("0");
  const [retail, setRetail] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const isEdit = Boolean(props.initial?.id);

  React.useEffect(() => {
    if (!props.open) return;
    setName(props.initial?.name ?? "");
    setCategory(props.initial?.category ?? "");
    setVariety(props.initial?.variety ?? "");
    setQty(String(props.initial?.quantityPurchased ?? 1));
    setUnitCost(String(props.initial?.unitCost ?? 0));
    setRetail(props.initial?.retailValue != null ? String(props.initial.retailValue) : "");
    setNotes(props.initial?.notes ?? "");
  }, [props.open, props.initial]);

  async function submit() {
    if (!name.trim()) {
      toast.error("Plant name is required.");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        name: name.trim(),
        category: category.trim() || null,
        variety: variety.trim() || null,
        quantityPurchased: Number.parseInt(qty, 10) || 0,
        unitCost: Number.parseFloat(unitCost) || 0,
        retailValue: retail ? Number.parseFloat(retail) : null,
        notes: notes.trim() || null,
      };

      const url = isEdit
        ? `/api/event-platform/events/${encodeURIComponent(props.eventId)}/plants/${encodeURIComponent(props.initial!.id!)}`
        : `/api/event-platform/events/${encodeURIComponent(props.eventId)}/plants`;

      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string };
      if (!res.ok || !data?.ok) {
        toast.error(data?.message ?? "Could not save plant.");
        return;
      }
      toast.success(isEdit ? "Plant updated." : "Plant added.");
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
          <DialogTitle>{isEdit ? "Edit plant" : "Add plant"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Category</Label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Variety</Label>
              <Input value={variety} onChange={(e) => setVariety(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Qty purchased</Label>
              <Input type="number" min={0} value={qty} onChange={(e) => setQty(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Unit cost</Label>
              <Input type="number" min={0} step="0.01" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Retail</Label>
              <Input type="number" min={0} step="0.01" value={retail} onChange={(e) => setRetail(e.target.value)} />
            </div>
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
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? "Save" : "Add plant"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
