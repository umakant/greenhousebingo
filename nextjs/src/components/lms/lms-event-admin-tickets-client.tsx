"use client";

import * as React from "react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowLeft,
  BarChart3,
  Download,
  FileBarChart,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  Tag,
  Ticket,
  Users,
  Wallet,
  ShoppingCart,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { LMS_TICKET_STATUSES } from "@/lib/lms-events/constants";
import type { LmsEventTicketStatus } from "@/lib/lms-events/constants";
import {
  lmsEventAdminAttendeesPath,
  lmsEventAdminDetailPath,
  lmsEventAdminEditPath,
} from "@/lib/lms-events/paths";
import type { LmsEvent, LmsEventTicket } from "@/lib/lms-events/types";
import { cn } from "@/lib/utils";

const DONUT_COLORS = ["#16a34a", "#0ea5e9", "#f59e0b", "#a855f7", "#ec4899"];
const REMAINING_COLOR = "#e5e7eb";

function money(n: number, currency = "USD"): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(n);
}

function pct(part: number, whole: number): string {
  if (!whole) return "0%";
  return `${((part / whole) * 100).toFixed(1)}%`;
}

function registrationBadge(status: LmsEvent["status"]): { label: string; className: string } | null {
  switch (status) {
    case "registration_open":
    case "published":
      return { label: "Registration Open", className: "bg-green-100 text-green-700" };
    case "in_progress":
      return { label: "Live Event", className: "bg-green-100 text-green-700" };
    case "sold_out":
      return { label: "Sold Out", className: "bg-red-100 text-red-700" };
    case "completed":
      return { label: "Completed", className: "bg-slate-100 text-slate-600" };
    case "cancelled":
      return { label: "Cancelled", className: "bg-red-100 text-red-700" };
    default:
      return { label: "Draft", className: "bg-amber-100 text-amber-700" };
  }
}

type DayPoint = { date: string; label: string; count: number };

/* --------------------------------- cards --------------------------------- */

function StatCard(props: {
  icon: React.ComponentType<{ className?: string }>;
  tint: string;
  label: string;
  value: string;
  hint?: string;
}) {
  const { icon: Icon, tint, label, value, hint } = props;
  return (
    <Card className="border-border/70">
      <CardContent className="flex items-start gap-3 p-4">
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", tint)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-0.5 text-2xl font-bold tracking-tight tabular-nums">{value}</p>
          {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}

function DetailRow(props: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  const { icon: Icon, label, children } = props;
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <span className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-3.5 w-3.5 opacity-70" />
        {label}
      </span>
      <span className="min-w-0 truncate text-right font-medium">{children}</span>
    </div>
  );
}

function TicketCard(props: { ticket: LmsEventTicket; eventId: string; onEdit: () => void }) {
  const { ticket, eventId, onEdit } = props;
  const revenue = ticket.price * ticket.soldCount;
  const isAvailable = ticket.ticketStatus === "available";
  const priceLabel = ticket.isFree ? "Free" : money(ticket.price, ticket.currency);

  return (
    <Card className="flex h-full flex-col border-2 border-green-100/70">
      <CardContent className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-green-100 text-green-600">
              <Ticket className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold leading-tight">{ticket.name}</p>
              <Badge
                className={cn(
                  "mt-1 border-0 text-[11px] font-medium",
                  isAvailable ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600",
                )}
              >
                {isAvailable ? "Active" : ticket.ticketStatus.replace(/_/g, " ")}
              </Badge>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onEdit(); }}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit ticket
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={lmsEventAdminAttendeesPath(eventId)}>
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  View sales
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div>
          <p className="text-3xl font-bold tracking-tight tabular-nums">{priceLabel}</p>
          <p className="text-xs text-muted-foreground">Price per ticket</p>
        </div>

        <div className="divide-y divide-border/60 border-y border-border/60">
          <DetailRow icon={Users} label="Sold">
            <span className="tabular-nums">
              {ticket.soldCount}
              {ticket.quantity != null ? ` / ${ticket.quantity}` : ""}
            </span>
          </DetailRow>
          <DetailRow icon={Ticket} label="Capacity">
            {ticket.quantity != null ? (
              <span className="tabular-nums">{ticket.quantity}</span>
            ) : (
              "Unlimited"
            )}
          </DetailRow>
          <DetailRow icon={Wallet} label="Revenue">
            <span className="tabular-nums">{money(revenue, ticket.currency)}</span>
          </DetailRow>
          <DetailRow icon={Tag} label="Status">
            <Badge
              variant="outline"
              className={cn(
                "border-0 text-[11px] font-medium",
                isAvailable ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-600",
              )}
            >
              {isAvailable ? "Available" : ticket.ticketStatus.replace(/_/g, " ")}
            </Badge>
          </DetailRow>
          <DetailRow icon={FileBarChart} label="Description">
            <span className="text-muted-foreground">{ticket.description || "—"}</span>
          </DetailRow>
        </div>

        <div className="mt-auto grid grid-cols-2 gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={lmsEventAdminAttendeesPath(eventId)}>View Sales</Link>
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
            Edit Ticket
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* --------------------------------- donut --------------------------------- */

function SalesDonut(props: { segments: Array<{ value: number; color: string }>; center: number; capacity: number }) {
  const { segments, center, capacity } = props;
  const size = 150;
  const stroke = 16;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = capacity > 0 ? capacity : segments.reduce((s, x) => s + x.value, 0) || 1;

  let offsetAcc = 0;
  const arcs = segments
    .filter((s) => s.value > 0)
    .map((s, i) => {
      const frac = s.value / total;
      const dash = frac * circumference;
      const arc = (
        <circle
          key={i}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={s.color}
          strokeWidth={stroke}
          strokeDasharray={`${dash} ${circumference - dash}`}
          strokeDashoffset={-offsetAcc}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          strokeLinecap="butt"
        />
      );
      offsetAcc += dash;
      return arc;
    });

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={REMAINING_COLOR} strokeWidth={stroke} />
        {arcs}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold tabular-nums">{center}</span>
        <span className="text-[11px] text-muted-foreground">of {capacity} sold</span>
      </div>
    </div>
  );
}

/* ----------------------------- edit ticket ------------------------------- */

const TICKET_STATUS_LABELS: Record<LmsEventTicketStatus, string> = {
  available: "Available",
  sold_out: "Sold out",
  closed: "Closed",
  hidden: "Hidden",
};

function EditTicketDrawer(props: {
  eventId: string;
  ticket: LmsEventTicket | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const { ticket } = props;
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [isFree, setIsFree] = React.useState(false);
  const [price, setPrice] = React.useState<number | null>(null);
  const [unlimited, setUnlimited] = React.useState(true);
  const [quantity, setQuantity] = React.useState("");
  const [status, setStatus] = React.useState<LmsEventTicketStatus>("available");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (props.open && ticket) {
      setName(ticket.name);
      setDescription(ticket.description ?? "");
      setIsFree(ticket.isFree);
      setPrice(ticket.isFree ? null : ticket.price);
      setUnlimited(ticket.quantity == null);
      setQuantity(ticket.quantity != null ? String(ticket.quantity) : "");
      setStatus(ticket.ticketStatus);
    }
  }, [props.open, ticket]);

  async function submit() {
    if (!ticket) return;
    if (!name.trim()) {
      toast.error("Ticket name is required.");
      return;
    }
    const qty = unlimited ? null : Number(quantity);
    if (!unlimited && (!Number.isInteger(qty) || (qty as number) < 0)) {
      toast.error("Capacity must be a whole number.");
      return;
    }
    if (qty != null && qty < ticket.soldCount) {
      toast.error(`Capacity cannot be lower than tickets already sold (${ticket.soldCount}).`);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/lms/admin/events/${encodeURIComponent(props.eventId)}/tickets/${encodeURIComponent(ticket.id)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim() || null,
            isFree,
            price: isFree ? 0 : (price ?? 0),
            quantity: qty,
            ticketStatus: status,
          }),
        },
      );
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string };
      if (!res.ok || !data?.ok) {
        toast.error(data?.message ?? "Could not update ticket.");
        return;
      }
      toast.success("Ticket updated.");
      props.onSaved();
      props.onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Edit Ticket</SheetTitle>
          <SheetDescription>
            Update pricing, capacity, and availability for this ticket type.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label>Ticket Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. General admission" />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's included with this ticket…"
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="ticket-free"
              checked={isFree}
              onCheckedChange={(v) => setIsFree(Boolean(v))}
            />
            <Label htmlFor="ticket-free">Free ticket</Label>
          </div>

          {!isFree ? (
            <div className="space-y-2">
              <Label>Price</Label>
              <CurrencyInput value={price} onChange={setPrice} showSymbol allowEmpty placeholder="0.00" />
            </div>
          ) : null}

          <div className="flex items-center gap-2">
            <Checkbox
              id="ticket-unlimited"
              checked={unlimited}
              onCheckedChange={(v) => setUnlimited(Boolean(v))}
            />
            <Label htmlFor="ticket-unlimited">Unlimited capacity</Label>
          </div>

          {!unlimited ? (
            <div className="space-y-2">
              <Label>Capacity</Label>
              <Input
                type="number"
                min={ticket?.soldCount ?? 0}
                step={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g. 80"
              />
              {ticket ? (
                <p className="text-xs text-muted-foreground">{ticket.soldCount} already sold.</p>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as LmsEventTicketStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LMS_TICKET_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {TICKET_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <SheetFooter className="mt-6 gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => props.onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={submitting} onClick={() => void submit()}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/* -------------------------------- main view ------------------------------- */

export function LmsEventAdminTicketsClient(props: { eventId: string }) {
  const [loading, setLoading] = React.useState(true);
  const [event, setEvent] = React.useState<LmsEvent | null>(null);
  const [tickets, setTickets] = React.useState<LmsEventTicket[]>([]);
  const [salesByDay, setSalesByDay] = React.useState<DayPoint[]>([]);
  const [range, setRange] = React.useState<"7" | "30" | "all">("7");
  const [summaryRange, setSummaryRange] = React.useState<"all" | "30">("all");
  const [discountsOpen, setDiscountsOpen] = React.useState(false);
  const [editTicket, setEditTicket] = React.useState<LmsEventTicket | null>(null);

  const reloadTickets = React.useCallback(async () => {
    const res = await fetch(`/api/lms/admin/events/${encodeURIComponent(props.eventId)}`, {
      credentials: "include",
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as
      | { ok?: boolean; event?: LmsEvent; tickets?: LmsEventTicket[] }
      | null;
    if (res.ok && data?.ok) {
      setEvent(data.event ?? null);
      setTickets(data.tickets ?? []);
    }
  }, [props.eventId]);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [ticketRes, analyticsRes] = await Promise.all([
        fetch(`/api/lms/admin/events/${encodeURIComponent(props.eventId)}`, {
          credentials: "include",
          cache: "no-store",
        }),
        fetch(
          `/api/event-platform/events/${encodeURIComponent(props.eventId)}/attendees?pageSize=25&sort=registered_at&sortDir=asc`,
          { credentials: "include", cache: "no-store" },
        ).catch(() => null),
      ]);

      const ticketData = (await ticketRes.json().catch(() => null)) as
        | { ok?: boolean; event?: LmsEvent; tickets?: LmsEventTicket[] }
        | null;
      if (!cancelled && ticketRes.ok && ticketData?.ok) {
        setEvent(ticketData.event ?? null);
        setTickets(ticketData.tickets ?? []);
      }

      if (analyticsRes && analyticsRes.ok) {
        const analyticsData = (await analyticsRes.json().catch(() => null)) as
          | { ok?: boolean; analytics?: { registrationsByDay?: DayPoint[] } }
          | null;
        if (!cancelled && analyticsData?.ok) {
          setSalesByDay(analyticsData.analytics?.registrationsByDay ?? []);
        }
      }

      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [props.eventId]);

  const currency = tickets[0]?.currency ?? event?.currency ?? "USD";
  const totalSold = tickets.reduce((s, t) => s + t.soldCount, 0);
  const totalRevenue = tickets.reduce((s, t) => s + t.price * t.soldCount, 0);
  const capacity = event?.capacity ?? tickets.reduce((s, t) => s + (t.quantity ?? 0), 0);
  const remaining = Math.max(0, capacity - totalSold);
  const aov = totalSold > 0 ? totalRevenue / totalSold : 0;

  const donutSegments = tickets.map((t, i) => ({
    value: t.soldCount,
    color: DONUT_COLORS[i % DONUT_COLORS.length],
  }));

  const chartData = React.useMemo(() => {
    if (range === "all") return salesByDay;
    const n = range === "7" ? 7 : 30;
    return salesByDay.slice(-n);
  }, [salesByDay, range]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading tickets…
      </div>
    );
  }

  const badge = event ? registrationBadge(event.status) : null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Event Tickets</h1>
            {badge ? (
              <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", badge.className)}>
                {badge.label}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage ticket types, pricing, and inventory for this event.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm" className="gap-1.5">
            <Link href={lmsEventAdminEditPath(props.eventId)}>
              <Plus className="h-4 w-4" />
              Add Ticket Type
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setDiscountsOpen(true)}
          >
            <Tag className="h-4 w-4" />
            Manage Discounts
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link href={`/api/event-platform/events/${encodeURIComponent(props.eventId)}/attendees/export`}>
              <Download className="h-4 w-4" />
              Export
            </Link>
          </Button>
        </div>
      </div>

      <Button asChild variant="outline" size="sm" className="gap-1.5">
        <Link href={lmsEventAdminDetailPath(props.eventId)}>
          <ArrowLeft className="h-4 w-4" />
          Back to event
        </Link>
      </Button>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Ticket} tint="bg-green-100 text-green-600" label="Total Capacity" value={String(capacity)} hint="Across all tickets" />
        <StatCard
          icon={ShoppingCart}
          tint="bg-blue-100 text-blue-600"
          label="Total Sold"
          value={String(totalSold)}
          hint={`${pct(totalSold, capacity)} sold`}
        />
        <StatCard icon={Wallet} tint="bg-violet-100 text-violet-600" label="Total Revenue" value={money(totalRevenue, currency)} hint="From ticket sales" />
        <StatCard icon={Users} tint="bg-amber-100 text-amber-600" label="Average Order Value" value={money(aov, currency)} hint="Per transaction" />
      </div>

      {/* Ticket types + sales summary */}
      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="grid gap-4 sm:grid-cols-2">
          {tickets.length === 0 ? (
            <Card className="sm:col-span-2">
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                No ticket types yet.{" "}
                <Link href={lmsEventAdminEditPath(props.eventId)} className="text-primary hover:underline">
                  Add one from the event editor.
                </Link>
              </CardContent>
            </Card>
          ) : (
            tickets.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                eventId={props.eventId}
                onEdit={() => setEditTicket(ticket)}
              />
            ))
          )}
        </div>

        {/* Sales summary */}
        <Card className="border-border/70">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center justify-between">
              <p className="font-semibold">Ticket sales summary</p>
              <Select value={summaryRange} onValueChange={(v) => setSummaryRange(v as "all" | "30")}>
                <SelectTrigger className="h-7 w-[92px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All time</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
              <SalesDonut segments={donutSegments} center={totalSold} capacity={capacity} />
              <ul className="w-full space-y-2 text-sm">
                {tickets.map((t, i) => (
                  <li key={t.id} className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }}
                      />
                      <span className="truncate text-muted-foreground">{t.name}</span>
                    </span>
                    <span className="shrink-0 tabular-nums">
                      {t.soldCount} ({pct(t.soldCount, capacity)})
                    </span>
                  </li>
                ))}
                <li className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: REMAINING_COLOR }} />
                    <span className="text-muted-foreground">Remaining</span>
                  </span>
                  <span className="tabular-nums">
                    {remaining} ({pct(remaining, capacity)})
                  </span>
                </li>
              </ul>
            </div>

            <div className="border-t pt-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-medium">Sales over time</p>
                <Select value={range} onValueChange={(v) => setRange(v as "7" | "30" | "all")}>
                  <SelectTrigger className="h-7 w-[92px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="all">All time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="h-[140px] w-full">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#16a34a" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#16a34a" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} width={28} />
                      <Tooltip
                        contentStyle={{ fontSize: 12, borderRadius: 8 }}
                        formatter={(v) => [Number(v), "Sales"]}
                      />
                      <Area type="monotone" dataKey="count" stroke="#16a34a" strokeWidth={2} fill="url(#salesFill)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                    No sales data yet.
                  </div>
                )}
              </div>
            </div>

            <Button asChild variant="outline" className="w-full gap-1.5">
              <Link href={lmsEventAdminAttendeesPath(props.eventId)}>
                <BarChart3 className="h-4 w-4" />
                View Detailed Report
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <Card className="border-border/70">
        <CardContent className="p-5">
          <p className="mb-3 font-semibold">Quick actions</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <QuickAction
              icon={Plus}
              tint="bg-green-100 text-green-600"
              title="Add Ticket Type"
              subtitle="Create a new ticket type"
              href={lmsEventAdminEditPath(props.eventId)}
            />
            <QuickAction
              icon={Tag}
              tint="bg-violet-100 text-violet-600"
              title="Manage Discounts"
              subtitle="Create promo codes"
              onClick={() => setDiscountsOpen(true)}
            />
            <QuickAction
              icon={ShoppingCart}
              tint="bg-blue-100 text-blue-600"
              title="View Orders"
              subtitle="See all ticket purchases"
              href={lmsEventAdminAttendeesPath(props.eventId)}
            />
            <QuickAction
              icon={Users}
              tint="bg-amber-100 text-amber-600"
              title="Attendee List"
              subtitle="View ticket holders"
              href={lmsEventAdminAttendeesPath(props.eventId)}
            />
            <QuickAction
              icon={Download}
              tint="bg-slate-100 text-slate-600"
              title="Export Sales"
              subtitle="Download sales data"
              href={`/api/event-platform/events/${encodeURIComponent(props.eventId)}/attendees/export`}
            />
          </div>
        </CardContent>
      </Card>

      <TicketDiscountsDrawer open={discountsOpen} onOpenChange={setDiscountsOpen} currency={currency} />
      <EditTicketDrawer
        eventId={props.eventId}
        ticket={editTicket}
        open={editTicket !== null}
        onOpenChange={(open) => {
          if (!open) setEditTicket(null);
        }}
        onSaved={() => void reloadTickets()}
      />
    </div>
  );
}

/* ------------------------------ discounts ------------------------------ */

type DiscountRow = {
  id: string;
  name: string;
  code: string;
  discount: string;
  type: string;
  status: boolean;
  expiry_date: string | null;
  limit: number | null;
};

function TicketDiscountsDrawer(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency: string;
}) {
  const [loading, setLoading] = React.useState(false);
  const [rows, setRows] = React.useState<DiscountRow[]>([]);
  const [forbidden, setForbidden] = React.useState(false);

  const [name, setName] = React.useState("");
  const [code, setCode] = React.useState("");
  const [type, setType] = React.useState<"percentage" | "fixed">("percentage");
  const [discount, setDiscount] = React.useState("");
  const [limit, setLimit] = React.useState("");
  const [expiry, setExpiry] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setForbidden(false);
    try {
      const res = await fetch("/api/coupons?per_page=100&sort=createdAt&direction=desc", {
        credentials: "include",
        cache: "no-store",
      });
      if (res.status === 403) {
        setForbidden(true);
        setRows([]);
        return;
      }
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; coupons?: { data?: DiscountRow[] } }
        | null;
      if (res.ok && data?.ok) setRows(data.coupons?.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (props.open) void load();
  }, [props.open, load]);

  async function create() {
    if (!name.trim()) {
      toast.error("Discount name is required.");
      return;
    }
    if (!code.trim()) {
      toast.error("Promo code is required.");
      return;
    }
    const amount = Number.parseFloat(discount) || 0;
    if (amount <= 0) {
      toast.error("Enter a discount value greater than zero.");
      return;
    }
    if (type === "percentage" && amount > 100) {
      toast.error("Percentage discount cannot exceed 100.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/coupons", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim().toUpperCase(),
          type,
          discount: amount,
          limit: limit.trim() || null,
          expiry_date: expiry.trim() || null,
          status: true,
        }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string };
      if (res.status === 403) {
        toast.error("You don't have permission to create discounts.");
        return;
      }
      if (!res.ok || !data?.ok) {
        toast.error(data?.message ?? "Could not create discount.");
        return;
      }
      toast.success("Discount code created.");
      setName("");
      setCode("");
      setDiscount("");
      setLimit("");
      setExpiry("");
      await load();
    } finally {
      setSaving(false);
    }
  }

  function formatValue(row: DiscountRow): string {
    const n = Number.parseFloat(row.discount) || 0;
    return row.type === "percentage" ? `${n}%` : money(n, props.currency);
  }

  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Manage Discounts</SheetTitle>
          <SheetDescription>Create and review promo codes that apply at checkout.</SheetDescription>
        </SheetHeader>

        {forbidden ? (
          <div className="mt-6 rounded-md border border-amber-500/40 bg-amber-50 p-3 text-sm text-amber-800">
            You don&apos;t have permission to manage discounts. Ask an admin for the “manage coupons” permission.
          </div>
        ) : (
          <>
            <div className="mt-6 space-y-3">
              <p className="text-sm font-medium">New discount code</p>
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Early bird" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Code</Label>
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="EARLY10"
                    className="uppercase"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={type} onValueChange={(v) => setType(v as "percentage" | "fixed")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="fixed">Fixed amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>{type === "percentage" ? "Percent" : "Amount"}</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Usage limit</Label>
                  <Input
                    type="number"
                    min={1}
                    value={limit}
                    onChange={(e) => setLimit(e.target.value)}
                    placeholder="∞"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Expires</Label>
                  <Input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
                </div>
              </div>
              <Button type="button" className="w-full gap-1.5" disabled={saving} onClick={() => void create()}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Create discount
              </Button>
            </div>

            <div className="mt-6 space-y-2">
              <p className="text-sm font-medium">Existing discounts</p>
              {loading ? (
                <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </div>
              ) : rows.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No discount codes yet.</p>
              ) : (
                <ul className="divide-y divide-border/60 rounded-md border">
                  {rows.map((row) => (
                    <li key={row.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{row.name}</p>
                        <p className="font-mono text-xs text-muted-foreground">{row.code}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-sm font-semibold tabular-nums">{formatValue(row)}</span>
                        <Badge
                          className={cn(
                            "border-0 text-[11px]",
                            row.status ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600",
                          )}
                        >
                          {row.status ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}

        <SheetFooter className="mt-6">
          <Button type="button" variant="outline" onClick={() => props.onOpenChange(false)}>
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function QuickAction(props: {
  icon: React.ComponentType<{ className?: string }>;
  tint: string;
  title: string;
  subtitle: string;
  href?: string;
  onClick?: () => void;
}) {
  const { icon: Icon, tint, title, subtitle, href, onClick } = props;
  const inner = (
    <div className="flex items-center gap-3 rounded-lg border border-border/70 p-3 transition-colors hover:border-primary/40 hover:bg-muted/40">
      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", tint)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
  if (href) {
    return (
      <Link href={href} className="block">
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className="block w-full text-left">
      {inner}
    </button>
  );
}
