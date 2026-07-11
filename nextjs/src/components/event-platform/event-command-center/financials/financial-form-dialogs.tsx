"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  EVENT_EXPENSE_CATEGORIES,
  EVENT_EXPENSE_CATEGORY_LABELS,
  EVENT_REVENUE_CATEGORIES,
  EVENT_REVENUE_CATEGORY_LABELS,
} from "@/lib/event-platform/event-financials/event-financials-constants";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
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

type ExpenseFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  onSaved: () => void;
};

export function ExpenseFormDialog(props: ExpenseFormDialogProps) {
  const [category, setCategory] = React.useState<string>("other");
  const [payeeName, setPayeeName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [quantity, setQuantity] = React.useState("1");
  const [unitCost, setUnitCost] = React.useState("");
  const [tax, setTax] = React.useState("0");
  const [notes, setNotes] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function submit() {
    setBusy(true);
    try {
      const res = await fetch(
        `/api/event-platform/events/${encodeURIComponent(props.eventId)}/financials/actions`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "add_expense",
            category,
            payeeName: payeeName.trim() || null,
            description: description.trim() || null,
            quantity: Number.parseFloat(quantity) || 1,
            unitCost: Number.parseFloat(unitCost) || 0,
            tax: Number.parseFloat(tax) || 0,
            notes: notes.trim() || null,
            paymentStatus: "pending",
          }),
        },
      );
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string };
      if (!res.ok || !data?.ok) {
        toast.error(data?.message ?? "Could not add expense.");
        return;
      }
      toast.success("Expense added.");
      props.onOpenChange(false);
      props.onSaved();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Add expense</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-3">
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVENT_EXPENSE_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {EVENT_EXPENSE_CATEGORY_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Payee</Label>
            <Input value={payeeName} onChange={(e) => setPayeeName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-2">
              <Label>Qty</Label>
              <Input type="number" min={0} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Unit cost</Label>
              <Input type="number" min={0} step="0.01" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Tax</Label>
              <Input type="number" min={0} step="0.01" value={tax} onChange={(e) => setTax(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <SheetFooter className="mt-6">
          <Button type="button" variant="outline" onClick={() => props.onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={busy} onClick={() => void submit()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add expense"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

type RevenueFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  onSaved: () => void;
};

export function RevenueFormDialog(props: RevenueFormDialogProps) {
  const [category, setCategory] = React.useState<string>("sponsor_revenue");
  const [payeeName, setPayeeName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function submit() {
    setBusy(true);
    try {
      const res = await fetch(
        `/api/event-platform/events/${encodeURIComponent(props.eventId)}/financials/actions`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "add_revenue",
            category,
            payeeName: payeeName.trim() || null,
            description: description.trim() || null,
            amount: Number.parseFloat(amount) || 0,
            paymentStatus: "paid",
          }),
        },
      );
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string };
      if (!res.ok || !data?.ok) {
        toast.error(data?.message ?? "Could not add revenue.");
        return;
      }
      toast.success("Revenue recorded.");
      props.onOpenChange(false);
      props.onSaved();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Add revenue</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-3">
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVENT_REVENUE_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {EVENT_REVENUE_CATEGORY_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Payee / source</Label>
            <Input value={payeeName} onChange={(e) => setPayeeName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Amount</Label>
            <Input type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
        </div>
        <SheetFooter className="mt-6">
          <Button type="button" variant="outline" onClick={() => props.onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={busy} onClick={() => void submit()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add revenue"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
