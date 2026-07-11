"use client";

import * as React from "react";
import { AlertTriangle, Loader2, Mail, Ticket } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

export type ActionAttendee = {
  registrationId: string;
  fullName: string;
  email: string;
  currency: string;
  totalSpend: number;
};

function formatMoney(value: number, currency: string): string {
  return `${value.toFixed(2)} ${currency}`;
}

/** Sell bonus cards to a known attendee. Posts to the live actions endpoint. */
export function SellBonusCardsDrawer(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  attendee: ActionAttendee | null;
  unitPrice: number;
  onSaved: () => void;
}) {
  const [quantity, setQuantity] = React.useState("1");
  const [paymentMethod, setPaymentMethod] = React.useState("cash");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (props.open) {
      setQuantity("1");
      setPaymentMethod("cash");
    }
  }, [props.open]);

  const qty = Math.max(1, Number(quantity) || 1);
  const total = props.unitPrice * qty;

  async function submit() {
    if (!props.attendee) return;
    setBusy(true);
    const res = await fetch(
      `/api/event-platform/events/${encodeURIComponent(props.eventId)}/live/actions`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sell_bonus_cards",
          registrationId: props.attendee.registrationId,
          quantity: qty,
          unitPrice: props.unitPrice,
          paymentMethod,
        }),
      },
    );
    const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string };
    setBusy(false);
    if (!res.ok || !data?.ok) {
      toast.error(data?.message ?? "Sale failed.");
      return;
    }
    toast.success("Bonus cards recorded.");
    props.onSaved();
    props.onOpenChange(false);
  }

  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Sell Bonus Cards</SheetTitle>
          <SheetDescription>
            {props.attendee ? `For ${props.attendee.fullName}` : "Records payment via existing transaction architecture."}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Quantity</Label>
              <Input
                className="h-10"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div>
              <Label>Unit Price</Label>
              <Input className="h-10" readOnly value={props.unitPrice.toFixed(2)} />
            </div>
          </div>
          <div>
            <Label>Payment</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Card</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-sm font-medium">
            Total: {formatMoney(total, props.attendee?.currency ?? "USD")}
          </p>
        </div>
        <SheetFooter className="mt-6">
          <Button variant="outline" onClick={() => props.onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={busy || !props.attendee} onClick={() => void submit()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Complete Sale"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/** Re-send the ticket confirmation to a known attendee. */
export function ResendTicketDrawer(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  attendee: ActionAttendee | null;
  onSaved: () => void;
}) {
  const [channel, setChannel] = React.useState("email");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (props.open) setChannel("email");
  }, [props.open]);

  async function submit() {
    if (!props.attendee) return;
    setBusy(true);
    const res = await fetch(
      `/api/event-platform/events/${encodeURIComponent(props.eventId)}/attendees/${encodeURIComponent(props.attendee.registrationId)}`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resend_ticket", channel }),
      },
    );
    const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string };
    setBusy(false);
    if (!res.ok || !data?.ok) {
      toast.error(data?.message ?? "Could not re-send ticket.");
      return;
    }
    toast.success(data.message ?? "Ticket re-sent.");
    props.onSaved();
    props.onOpenChange(false);
  }

  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Resend Ticket</SheetTitle>
          <SheetDescription>
            {props.attendee
              ? `Re-issue the ticket confirmation for ${props.attendee.fullName}.`
              : "Re-issue the ticket confirmation."}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            <div className="flex items-center gap-2 font-medium">
              <Ticket className="h-4 w-4 text-emerald-600" />
              {props.attendee?.fullName ?? "Attendee"}
            </div>
            <div className="mt-1 flex items-center gap-2 text-muted-foreground">
              <Mail className="h-3.5 w-3.5" />
              {props.attendee?.email ?? "—"}
            </div>
          </div>
          <div>
            <Label>Delivery Channel</Label>
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            External delivery depends on the connected notification channel. The resend is always
            recorded in the activity log.
          </p>
        </div>
        <SheetFooter className="mt-6">
          <Button variant="outline" onClick={() => props.onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={busy || !props.attendee} onClick={() => void submit()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Resend Ticket"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/** Issue a refund against an attendee's registration. */
export function IssueRefundDrawer(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  attendee: ActionAttendee | null;
  onSaved: () => void;
}) {
  const [amount, setAmount] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [confirmed, setConfirmed] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (props.open) {
      setAmount(props.attendee ? String(props.attendee.totalSpend.toFixed(2)) : "");
      setReason("");
      setConfirmed(false);
    }
  }, [props.open, props.attendee]);

  async function submit() {
    if (!props.attendee) return;
    if (!confirmed) {
      toast.error("Please confirm the refund.");
      return;
    }
    setBusy(true);
    const res = await fetch(
      `/api/event-platform/events/${encodeURIComponent(props.eventId)}/attendees/${encodeURIComponent(props.attendee.registrationId)}`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "refund",
          amount: amount ? Number(amount) : null,
          reason: reason || null,
        }),
      },
    );
    const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string };
    setBusy(false);
    if (!res.ok || !data?.ok) {
      toast.error(data?.message ?? "Refund failed.");
      return;
    }
    toast.success(data.message ?? "Refund issued.");
    props.onSaved();
    props.onOpenChange(false);
  }

  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Issue Refund</SheetTitle>
          <SheetDescription>
            {props.attendee
              ? `Refund ${props.attendee.fullName} and mark the registration refunded.`
              : "Refund the registration."}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">
            <div className="flex items-center gap-2 font-medium">
              <AlertTriangle className="h-4 w-4" />
              This marks the booking as refunded
            </div>
            <p className="mt-1 text-xs">
              Total paid: {formatMoney(props.attendee?.totalSpend ?? 0, props.attendee?.currency ?? "USD")}
            </p>
          </div>
          <div>
            <Label>Refund Amount</Label>
            <Input
              className="h-10"
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div>
            <Label>Reason (optional)</Label>
            <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={confirmed} onCheckedChange={(v) => setConfirmed(Boolean(v))} />
            I confirm this refund should be processed
          </label>
        </div>
        <SheetFooter className="mt-6">
          <Button variant="outline" onClick={() => props.onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={busy || !props.attendee}
            onClick={() => void submit()}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Issue Refund"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
