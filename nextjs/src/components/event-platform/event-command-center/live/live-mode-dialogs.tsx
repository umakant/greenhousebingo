"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import type { EventAttendeeRow } from "@/lib/event-platform/attendees/event-attendees-types";
import type { LiveEventSnapshot } from "@/lib/event-platform/live-event/live-event-types";
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
import { formatPhone, normalizeMobileForStorage } from "@/lib/phone";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

async function postLiveAction(eventId: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/event-platform/events/${encodeURIComponent(eventId)}/live/actions`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string; data?: Record<string, unknown> };
  return { res, data };
}

export function WalkInDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  snapshot: LiveEventSnapshot;
  onSaved: () => void;
}) {
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [ticketId, setTicketId] = React.useState("");
  const [paymentMethod, setPaymentMethod] = React.useState("cash");
  const [amount, setAmount] = React.useState("");
  const [checkInNow, setCheckInNow] = React.useState(true);
  const [consent, setConsent] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const tiers = props.snapshot.ticketTiers.filter((t) => !t.isBonus);

  React.useEffect(() => {
    if (props.open && tiers[0] && !ticketId) {
      setTicketId(tiers[0].id);
      setAmount(String(tiers[0].price));
    }
  }, [props.open, tiers, ticketId]);

  async function submit() {
    if (!consent) {
      toast.error("Marketing consent is required for walk-in registration.");
      return;
    }
    setBusy(true);
    const { res, data } = await postLiveAction(props.eventId, {
      action: "walk_in",
      firstName,
      lastName,
      phone: normalizeMobileForStorage(phone) ?? phone.trim(),
      email: email || undefined,
      ticketId,
      paymentMethod,
      amount: Number(amount) || 0,
      checkInNow,
      marketingConsent: consent,
    });
    setBusy(false);
    if (!res.ok || !data?.ok) {
      toast.error(data?.message ?? "Could not add walk-in.");
      return;
    }
    toast.success("Walk-in registered.");
    props.onSaved();
    props.onOpenChange(false);
  }

  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Add walk-in</SheetTitle>
          <SheetDescription>Creates a valid registration and optional check-in.</SheetDescription>
        </SheetHeader>
        <div className="mt-6 grid gap-3">
          <div className="grid grid-cols-2 gap-2">
            <div><Label>First name</Label><Input className="h-10" value={firstName} onChange={(e) => setFirstName(e.target.value)} /></div>
            <div><Label>Last name</Label><Input className="h-10" value={lastName} onChange={(e) => setLastName(e.target.value)} /></div>
          </div>
          <div>
            <Label>Phone</Label>
            <Input
              className="h-10"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              placeholder="(000) 000-0000"
            />
          </div>
          <div><Label>Email (optional)</Label><Input className="h-10" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div>
            <Label>Ticket tier</Label>
            <Select value={ticketId} onValueChange={(v) => { setTicketId(v); const t = tiers.find((x) => x.id === v); if (t) setAmount(String(t.price)); }}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                {tiers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name} — {t.price.toFixed(2)} {t.currency}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Payment</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="comp">Comp</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Amount</Label><Input className="h-10" type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={checkInNow} onCheckedChange={(v) => setCheckInNow(Boolean(v))} />
            Check in immediately
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={consent} onCheckedChange={(v) => setConsent(Boolean(v))} />
            Guest consents to registration & communications
          </label>
        </div>
        <SheetFooter className="mt-6">
          <Button variant="outline" onClick={() => props.onOpenChange(false)}>Cancel</Button>
          <Button disabled={busy || !firstName.trim() || !phone.trim()} onClick={() => void submit()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Register walk-in"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function BonusCardSaleDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  snapshot: LiveEventSnapshot;
  onSaved: () => void;
}) {
  const [search, setSearch] = React.useState("");
  const [rows, setRows] = React.useState<EventAttendeeRow[]>([]);
  const [registrationId, setRegistrationId] = React.useState("");
  const [quantity, setQuantity] = React.useState("1");
  const [paymentMethod, setPaymentMethod] = React.useState("cash");
  const [busy, setBusy] = React.useState(false);
  const unit = props.snapshot.bonusUnitPrice ?? 0;

  React.useEffect(() => {
    if (!props.open || search.trim().length < 2) { setRows([]); return; }
    const t = window.setTimeout(async () => {
      const qs = new URLSearchParams({ q: search.trim(), pageSize: "8" });
      const res = await fetch(`/api/event-platform/events/${encodeURIComponent(props.eventId)}/attendees?${qs}`, { credentials: "include" });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; rows?: EventAttendeeRow[] };
      setRows(data?.ok ? (data.rows ?? []) : []);
    }, 300);
    return () => window.clearTimeout(t);
  }, [props.open, props.eventId, search]);

  async function submit() {
    if (!registrationId) { toast.error("Select an attendee."); return; }
    setBusy(true);
    const qty = Math.max(1, Number(quantity) || 1);
    const { res, data } = await postLiveAction(props.eventId, {
      action: "sell_bonus_cards",
      registrationId,
      quantity: qty,
      unitPrice: unit,
      paymentMethod,
    });
    setBusy(false);
    if (!res.ok || !data?.ok) { toast.error(data?.message ?? "Sale failed."); return; }
    toast.success("Bonus cards recorded.");
    props.onSaved();
    props.onOpenChange(false);
  }

  const total = unit * (Number(quantity) || 1);

  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Sell bonus cards</SheetTitle>
          <SheetDescription>Records payment via existing transaction architecture.</SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-3">
          <div><Label>Find attendee</Label><Input className="h-10" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or email…" /></div>
          {rows.length > 0 && (
            <Select value={registrationId} onValueChange={setRegistrationId}>
              <SelectTrigger className="h-10"><SelectValue placeholder="Select attendee" /></SelectTrigger>
              <SelectContent>
                {rows.map((r) => (
                  <SelectItem key={r.registrationId} value={r.registrationId}>{r.fullName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Quantity</Label><Input className="h-10" type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} /></div>
            <div><Label>Unit price</Label><Input className="h-10" readOnly value={unit.toFixed(2)} /></div>
          </div>
          <div>
            <Label>Payment</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Card</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-sm font-medium">Total: {total.toFixed(2)} {props.snapshot.currency}</p>
        </div>
        <SheetFooter className="mt-6">
          <Button variant="outline" onClick={() => props.onOpenChange(false)}>Cancel</Button>
          <Button disabled={busy} onClick={() => void submit()}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Complete sale"}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function AnnouncementDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  onSaved: () => void;
}) {
  const [audience, setAudience] = React.useState("checked_in");
  const [message, setMessage] = React.useState("");
  const [confirmed, setConfirmed] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  async function submit() {
    if (!confirmed) { toast.error("Confirm before sending."); return; }
    setBusy(true);
    const { res, data } = await postLiveAction(props.eventId, {
      action: "send_announcement",
      audience,
      message,
      confirmed: true,
    });
    setBusy(false);
    if (!res.ok || !data?.ok) { toast.error(data?.message ?? "Could not queue announcement."); return; }
    toast.success(data.message ?? "Announcement queued.");
    props.onSaved();
    props.onOpenChange(false);
  }

  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Send announcement</SheetTitle>
          <SheetDescription>External delivery requires connected channels. Message is logged and queued.</SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-3">
          <div>
            <Label>Audience</Label>
            <Select value={audience} onValueChange={setAudience}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all_registered">All registered</SelectItem>
                <SelectItem value="checked_in">Checked in</SelectItem>
                <SelectItem value="not_checked_in">Not checked in</SelectItem>
                <SelectItem value="winners">Winners</SelectItem>
                <SelectItem value="host">Host</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Message</Label><Textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} /></div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={confirmed} onCheckedChange={(v) => setConfirmed(Boolean(v))} />
            I confirm this message should be sent to the selected audience
          </label>
        </div>
        <SheetFooter className="mt-6">
          <Button variant="outline" onClick={() => props.onOpenChange(false)}>Cancel</Button>
          <Button disabled={busy || !message.trim()} onClick={() => void submit()}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function IncidentDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  onSaved: () => void;
}) {
  const [category, setCategory] = React.useState("Operations");
  const [severity, setSeverity] = React.useState("info");
  const [description, setDescription] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function submit() {
    setBusy(true);
    const { res, data } = await postLiveAction(props.eventId, {
      action: "add_incident",
      category,
      severity,
      description,
    });
    setBusy(false);
    if (!res.ok || !data?.ok) { toast.error(data?.message ?? "Could not save note."); return; }
    toast.success("Incident note saved.");
    props.onSaved();
    props.onOpenChange(false);
  }

  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Incident note</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Category</Label><Input className="h-10" value={category} onChange={(e) => setCategory(e.target.value)} /></div>
            <div>
              <Label>Severity</Label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Description</Label><Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        </div>
        <SheetFooter className="mt-6">
          <Button variant="outline" onClick={() => props.onOpenChange(false)}>Cancel</Button>
          <Button disabled={busy || !description.trim()} onClick={() => void submit()}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
