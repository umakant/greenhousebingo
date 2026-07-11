"use client";

import * as React from "react";
import {
  AlertTriangle,
  CalendarPlus,
  Copy,
  ImagePlus,
  Loader2,
  Pencil,
  Sprout,
  Trophy,
  User,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { useEventCommandCenter } from "@/components/event-platform/event-command-center/event-command-center-context";
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
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  EVENT_EXPENSE_CATEGORIES,
  EVENT_EXPENSE_CATEGORY_LABELS,
} from "@/lib/event-platform/event-financials/event-financials-constants";
import {
  EVENT_BINGO_CARD_TYPES,
  EVENT_BINGO_CARD_TYPE_LABELS,
} from "@/lib/event-platform/bingo-rounds/bingo-round-constants";
import type { EventBingoCardType } from "@/lib/event-platform/bingo-rounds/bingo-round-constants";
import type { EventBingoRoundDto } from "@/lib/event-platform/bingo-rounds/bingo-round-types";
import type { EventAttendeeRow } from "@/lib/event-platform/attendees/event-attendees-types";
import { isBonusBingoCardTicket } from "@/lib/lms-events/event-wizard-input";
import { formatPhone, normalizeMobileForStorage } from "@/lib/phone";

export type EventActionId =
  | "add_attendee"
  | "add_expense"
  | "add_plant"
  | "add_game"
  | "record_winner"
  | "message"
  | "duplicate"
  | "schedule_again"
  | "cancel";

const ACTION_META: Record<EventActionId, { title: string; description: string }> = {
  add_attendee: { title: "Add Attendee", description: "Register a walk-in guest and optionally check them in." },
  add_expense: { title: "Add Expense", description: "Record an expense against this event." },
  add_plant: { title: "Add Plant", description: "Add a plant to the event prize inventory." },
  add_game: { title: "Add Game", description: "Bingo rounds are configured in the event editor." },
  record_winner: { title: "Record Winner", description: "Log a bingo winner for a completed or active round." },
  message: { title: "Message Attendees", description: "Send an announcement to a chosen audience." },
  duplicate: { title: "Duplicate Event", description: "Create a copy of this event to edit." },
  schedule_again: { title: "Schedule Again", description: "Reuse this event's setup for a new date." },
  cancel: { title: "Cancel Event", description: "Cancel this event and notify stakeholders." },
};

type EventActionsDrawerProps = {
  action: EventActionId | null;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
};

export function EventActionsDrawer(props: EventActionsDrawerProps) {
  const { eventId, reload } = useEventCommandCenter();
  const open = props.action != null;
  const meta = props.action ? ACTION_META[props.action] : null;

  const close = React.useCallback(() => props.onOpenChange(false), [props]);
  const done = React.useCallback(() => {
    void reload();
    close();
  }, [reload, close]);

  return (
    <Sheet open={open} onOpenChange={props.onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        {meta ? (
          <SheetHeader className="border-b px-6 py-4">
            <SheetTitle>{meta.title}</SheetTitle>
            <SheetDescription>{meta.description}</SheetDescription>
          </SheetHeader>
        ) : null}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {props.action === "add_attendee" ? <AddAttendeeForm eventId={eventId} onDone={done} onCancel={close} /> : null}
          {props.action === "add_expense" ? <AddExpenseForm eventId={eventId} onDone={done} onCancel={close} /> : null}
          {props.action === "add_plant" ? <AddPlantForm eventId={eventId} onDone={done} onCancel={close} /> : null}
          {props.action === "record_winner" ? <RecordWinnerForm eventId={eventId} onDone={done} onCancel={close} /> : null}
          {props.action === "message" ? <MessageForm eventId={eventId} onDone={done} onCancel={close} /> : null}
          {props.action === "add_game" ? (
            <EditorRedirectPanel
              icon={Trophy}
              message="Bingo games and rounds are managed inside the event editor. Open the editor to add or reorder rounds."
              onEdit={() => {
                close();
                props.onEdit();
              }}
              onCancel={close}
            />
          ) : null}
          {props.action === "duplicate" ? (
            <EditorRedirectPanel
              icon={Copy}
              message="Open the event editor to review the details, then use Save as new to create a copy for another date."
              onEdit={() => {
                close();
                props.onEdit();
              }}
              onCancel={close}
            />
          ) : null}
          {props.action === "schedule_again" ? (
            <EditorRedirectPanel
              icon={CalendarPlus}
              message="Reuse this event's configuration by opening the editor and adjusting the schedule for the new date."
              onEdit={() => {
                close();
                props.onEdit();
              }}
              onCancel={close}
            />
          ) : null}
          {props.action === "cancel" ? (
            <EditorRedirectPanel
              icon={XCircle}
              destructive
              message="Cancelling an event stops registrations and should notify attendees. Open the editor and set the status to Cancelled to proceed."
              onEdit={() => {
                close();
                props.onEdit();
              }}
              onCancel={close}
            />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Read an image file and downscale it to a compact JPEG data URL for storage as an avatar. */
async function fileToDownscaledDataUrl(file: File, max = 320): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(new Error("Could not read file."));
    fr.readAsDataURL(file);
  });
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Could not load image."));
      image.src = dataUrl;
    });
    const scale = Math.min(1, max / Math.max(img.width, img.height || 1));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", 0.82);
  } catch {
    return dataUrl;
  }
}

/* ------------------------------- shared bits ------------------------------- */

function Field(props: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={props.className}>
      <Label className="mb-1.5 block text-xs font-medium">{props.label}</Label>
      {props.children}
    </div>
  );
}

function FormFooter(props: { busy?: boolean; submitLabel: string; disabled?: boolean; onSubmit: () => void; onCancel: () => void }) {
  return (
    <div className="mt-6 flex justify-end gap-2">
      <Button type="button" variant="outline" onClick={props.onCancel}>
        Cancel
      </Button>
      <Button type="button" disabled={props.busy || props.disabled} onClick={props.onSubmit}>
        {props.busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {props.submitLabel}
      </Button>
    </div>
  );
}

function EditorRedirectPanel(props: {
  icon: React.ComponentType<{ className?: string }>;
  message: string;
  destructive?: boolean;
  onEdit: () => void;
  onCancel: () => void;
}) {
  const Icon = props.icon;
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-xl border bg-muted/40 p-4">
        <div
          className={
            props.destructive
              ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600"
              : "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
          }
        >
          <Icon className="h-5 w-5" />
        </div>
        <p className="text-sm text-muted-foreground">{props.message}</p>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={props.onCancel}>
          Close
        </Button>
        <Button type="button" variant={props.destructive ? "destructive" : "default"} onClick={props.onEdit}>
          <Pencil className="mr-2 h-4 w-4" />
          Open event editor
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------ add attendee ------------------------------- */

function AddAttendeeForm(props: { eventId: string; onDone: () => void; onCancel: () => void }) {
  const { tickets } = useEventCommandCenter();
  const tiers = tickets.filter((t) => !isBonusBingoCardTicket(t));

  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [ticketId, setTicketId] = React.useState(tiers[0]?.id ?? "");
  const [paymentMethod, setPaymentMethod] = React.useState("cash");
  const [amount, setAmount] = React.useState(tiers[0] ? String(tiers[0].price) : "");
  const [checkInNow, setCheckInNow] = React.useState(true);
  const [consent, setConsent] = React.useState(false);
  const [photo, setPhoto] = React.useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  async function onPhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    setPhotoBusy(true);
    try {
      setPhoto(await fileToDownscaledDataUrl(file));
    } catch {
      toast.error("Could not process that image.");
    } finally {
      setPhotoBusy(false);
    }
  }

  async function submit() {
    if (!consent) {
      toast.error("Marketing consent is required for walk-in registration.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/event-platform/events/${encodeURIComponent(props.eventId)}/live/actions`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
          photoUrl: photo ?? undefined,
        }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string };
      if (!res.ok || !data?.ok) {
        toast.error(data?.message ?? "Could not add attendee.");
        return;
      }
      toast.success("Attendee registered.");
      props.onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-muted-foreground/30 bg-muted/40 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          aria-label="Add attendee photo"
        >
          {photoBusy ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="Attendee" className="h-full w-full object-cover" />
          ) : (
            <User className="h-6 w-6" />
          )}
        </button>
        <div className="min-w-0">
          <p className="text-sm font-medium">Attendee photo</p>
          <p className="text-xs text-muted-foreground">Optional — helps staff identify the guest.</p>
          <div className="mt-1.5 flex gap-2">
            <Button type="button" size="sm" variant="outline" className="h-7 gap-1.5 px-2" onClick={() => fileInputRef.current?.click()}>
              <ImagePlus className="h-3.5 w-3.5" />
              {photo ? "Change" : "Add photo"}
            </Button>
            {photo ? (
              <Button type="button" size="sm" variant="ghost" className="h-7 gap-1.5 px-2 text-muted-foreground" onClick={() => setPhoto(null)}>
                <X className="h-3.5 w-3.5" />
                Remove
              </Button>
            ) : null}
          </div>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => void onPhotoSelected(e)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="First name">
          <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </Field>
        <Field label="Last name">
          <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </Field>
      </div>
      <Field label="Phone">
        <Input value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="(000) 000-0000" />
      </Field>
      <Field label="Email (optional)">
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field label="Ticket tier">
        <Select
          value={ticketId}
          onValueChange={(v) => {
            setTicketId(v);
            const t = tiers.find((x) => x.id === v);
            if (t) setAmount(String(t.price));
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select ticket" />
          </SelectTrigger>
          <SelectContent>
            {tiers.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name} — {t.price.toFixed(2)} {t.currency}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Payment">
          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="card">Card</SelectItem>
              <SelectItem value="comp">Comp</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Amount">
          <Input type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={checkInNow} onCheckedChange={(v) => setCheckInNow(Boolean(v))} />
        Check in immediately
      </label>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={consent} onCheckedChange={(v) => setConsent(Boolean(v))} />
        Guest consents to registration &amp; communications
      </label>
      <FormFooter
        busy={busy}
        disabled={!firstName.trim() || !phone.trim() || !ticketId}
        submitLabel="Register attendee"
        onSubmit={() => void submit()}
        onCancel={props.onCancel}
      />
    </div>
  );
}

/* ------------------------------- add expense ------------------------------- */

function AddExpenseForm(props: { eventId: string; onDone: () => void; onCancel: () => void }) {
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
      const res = await fetch(`/api/event-platform/events/${encodeURIComponent(props.eventId)}/financials/actions`, {
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
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string };
      if (!res.ok || !data?.ok) {
        toast.error(data?.message ?? "Could not add expense.");
        return;
      }
      toast.success("Expense added.");
      props.onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <Field label="Category">
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
      </Field>
      <Field label="Payee">
        <Input value={payeeName} onChange={(e) => setPayeeName(e.target.value)} />
      </Field>
      <Field label="Description">
        <Input value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Qty">
          <Input type="number" min={0} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </Field>
        <Field label="Unit cost">
          <Input type="number" min={0} step="0.01" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} />
        </Field>
        <Field label="Tax">
          <Input type="number" min={0} step="0.01" value={tax} onChange={(e) => setTax(e.target.value)} />
        </Field>
      </div>
      <Field label="Notes">
        <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <FormFooter busy={busy} submitLabel="Add expense" onSubmit={() => void submit()} onCancel={props.onCancel} />
    </div>
  );
}

/* -------------------------------- add plant -------------------------------- */

function AddPlantForm(props: { eventId: string; onDone: () => void; onCancel: () => void }) {
  const [name, setName] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [variety, setVariety] = React.useState("");
  const [qty, setQty] = React.useState("1");
  const [unitCost, setUnitCost] = React.useState("0");
  const [retail, setRetail] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function submit() {
    if (!name.trim()) {
      toast.error("Plant name is required.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/event-platform/events/${encodeURIComponent(props.eventId)}/plants`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          category: category.trim() || null,
          variety: variety.trim() || null,
          quantityPurchased: Number.parseInt(qty, 10) || 0,
          unitCost: Number.parseFloat(unitCost) || 0,
          retailValue: retail ? Number.parseFloat(retail) : null,
          notes: notes.trim() || null,
        }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string };
      if (!res.ok || !data?.ok) {
        toast.error(data?.message ?? "Could not add plant.");
        return;
      }
      toast.success("Plant added.");
      props.onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <Field label="Name">
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Category">
          <Input value={category} onChange={(e) => setCategory(e.target.value)} />
        </Field>
        <Field label="Variety">
          <Input value={variety} onChange={(e) => setVariety(e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Qty purchased">
          <Input type="number" min={0} value={qty} onChange={(e) => setQty(e.target.value)} />
        </Field>
        <Field label="Unit cost">
          <Input type="number" min={0} step="0.01" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} />
        </Field>
        <Field label="Retail">
          <Input type="number" min={0} step="0.01" value={retail} onChange={(e) => setRetail(e.target.value)} />
        </Field>
      </div>
      <Field label="Notes">
        <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
        <Sprout className="h-4 w-4 shrink-0" />
        Plants become available as bingo prizes for this event.
      </div>
      <FormFooter busy={busy} submitLabel="Add plant" onSubmit={() => void submit()} onCancel={props.onCancel} />
    </div>
  );
}

/* ------------------------------ record winner ------------------------------ */

function RecordWinnerForm(props: { eventId: string; onDone: () => void; onCancel: () => void }) {
  const [rounds, setRounds] = React.useState<EventBingoRoundDto[]>([]);
  const [roundsLoading, setRoundsLoading] = React.useState(true);
  const [roundId, setRoundId] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [attendees, setAttendees] = React.useState<EventAttendeeRow[]>([]);
  const [registrationId, setRegistrationId] = React.useState("");
  const [winningCardNumber, setWinningCardNumber] = React.useState("");
  const [cardType, setCardType] = React.useState<EventBingoCardType>("included");
  const [prizeLabel, setPrizeLabel] = React.useState("");
  const [verified, setVerified] = React.useState(false);
  const [notes, setNotes] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    void fetch(`/api/event-platform/events/${encodeURIComponent(props.eventId)}/games`, {
      credentials: "include",
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((d: { ok?: boolean; overview?: { rounds?: EventBingoRoundDto[]; currentRoundId?: string | null } }) => {
        if (!active || !d?.ok || !d.overview) return;
        const list = d.overview.rounds ?? [];
        setRounds(list);
        const preferred = d.overview.currentRoundId ?? list[0]?.id ?? "";
        setRoundId(preferred);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setRoundsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [props.eventId]);

  const selectedRound = rounds.find((r) => r.id === roundId);

  React.useEffect(() => {
    if (selectedRound && !prizeLabel) setPrizeLabel(selectedRound.assignedPrize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundId]);

  React.useEffect(() => {
    const q = search.trim();
    if (q.length < 2) {
      setAttendees([]);
      return;
    }
    const t = window.setTimeout(async () => {
      const qs = new URLSearchParams({ q, pageSize: "8" });
      const res = await fetch(`/api/event-platform/events/${encodeURIComponent(props.eventId)}/attendees?${qs}`, {
        credentials: "include",
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; rows?: EventAttendeeRow[] };
      setAttendees(data?.ok ? (data.rows ?? []) : []);
    }, 300);
    return () => window.clearTimeout(t);
  }, [props.eventId, search]);

  async function submit() {
    if (!roundId || !registrationId || !winningCardNumber.trim()) {
      toast.error("Round, attendee, and winning card number are required.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/event-platform/events/${encodeURIComponent(props.eventId)}/games/winners`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roundInstanceId: roundId,
          registrationId,
          winningCardNumber: winningCardNumber.trim(),
          cardType,
          prizeLabel: prizeLabel.trim(),
          verified,
          notes: notes.trim() || null,
        }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string };
      if (!res.ok || !data?.ok) {
        toast.error(data?.message ?? "Could not record winner.");
        return;
      }
      toast.success("Winner recorded.");
      props.onDone();
    } finally {
      setBusy(false);
    }
  }

  if (roundsLoading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading rounds…
      </div>
    );
  }

  if (rounds.length === 0) {
    return (
      <div className="rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
        No bingo rounds are configured for this event yet. Add rounds in the event editor first.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Field label="Round">
        <Select value={roundId} onValueChange={setRoundId}>
          <SelectTrigger>
            <SelectValue placeholder="Select round" />
          </SelectTrigger>
          <SelectContent>
            {rounds.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                Round {r.roundNumber}: {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Find attendee">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or email…" />
      </Field>
      {attendees.length > 0 ? (
        <Field label="Winner">
          <Select value={registrationId} onValueChange={setRegistrationId}>
            <SelectTrigger>
              <SelectValue placeholder="Select attendee" />
            </SelectTrigger>
            <SelectContent>
              {attendees.map((a) => (
                <SelectItem key={a.registrationId} value={a.registrationId}>
                  {a.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      ) : null}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Winning card #">
          <Input value={winningCardNumber} onChange={(e) => setWinningCardNumber(e.target.value)} />
        </Field>
        <Field label="Card type">
          <Select value={cardType} onValueChange={(v) => setCardType(v as EventBingoCardType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EVENT_BINGO_CARD_TYPES.map((c) => (
                <SelectItem key={c} value={c}>
                  {EVENT_BINGO_CARD_TYPE_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <Field label="Prize">
        <Input value={prizeLabel} onChange={(e) => setPrizeLabel(e.target.value)} />
      </Field>
      <Field label="Notes">
        <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={verified} onCheckedChange={(v) => setVerified(Boolean(v))} />
        Mark as verified
      </label>
      <FormFooter
        busy={busy}
        disabled={!registrationId || !winningCardNumber.trim()}
        submitLabel="Record winner"
        onSubmit={() => void submit()}
        onCancel={props.onCancel}
      />
    </div>
  );
}

/* ----------------------------- message attendees --------------------------- */

function MessageForm(props: { eventId: string; onDone: () => void; onCancel: () => void }) {
  const [audience, setAudience] = React.useState("all_registered");
  const [message, setMessage] = React.useState("");
  const [confirmed, setConfirmed] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  async function submit() {
    if (!confirmed) {
      toast.error("Please confirm before sending.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/event-platform/events/${encodeURIComponent(props.eventId)}/live/actions`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send_announcement", audience, message, confirmed: true }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string };
      if (!res.ok || !data?.ok) {
        toast.error(data?.message ?? "Could not queue message.");
        return;
      }
      toast.success(data.message ?? "Message queued.");
      props.onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <Field label="Audience">
        <Select value={audience} onValueChange={setAudience}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all_registered">All registered</SelectItem>
            <SelectItem value="checked_in">Checked in</SelectItem>
            <SelectItem value="not_checked_in">Not checked in</SelectItem>
            <SelectItem value="winners">Winners</SelectItem>
            <SelectItem value="host">Host</SelectItem>
            <SelectItem value="staff">Staff</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Message">
        <Textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type your announcement…" />
      </Field>
      <div className="flex items-start gap-2 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        External delivery requires connected channels. The message is logged and queued.
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={confirmed} onCheckedChange={(v) => setConfirmed(Boolean(v))} />
        I confirm this message should be sent to the selected audience
      </label>
      <FormFooter
        busy={busy}
        disabled={!message.trim()}
        submitLabel="Send message"
        onSubmit={() => void submit()}
        onCancel={props.onCancel}
      />
    </div>
  );
}
