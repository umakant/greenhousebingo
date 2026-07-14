"use client";

import * as React from "react";
import Link from "next/link";
import {
  Ban,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Crown,
  Download,
  Filter,
  ImagePlus,
  List,
  Loader2,
  Megaphone,
  MoreHorizontal,
  Plus,
  RefreshCw,
  ScanLine,
  Search,
  Send,
  Star,
  Ticket,
  Trophy,
  User,
  UserCheck,
  UserPlus,
  Users,
  UserX,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableActionButton } from "@/components/ui/table-action-button";
import type {
  EventAttendeeRow,
  EventAttendeesListResult,
  EventAttendeeSortField,
} from "@/lib/event-platform/attendees/event-attendees-types";
import {
  IssueRefundDrawer,
  ResendTicketDrawer,
  SellBonusCardsDrawer as AttendeeBonusDrawer,
  type ActionAttendee,
} from "@/components/event-platform/event-command-center/attendees/attendee-action-drawers";
import { RecordWinnerDialog } from "@/components/event-platform/event-command-center/games/record-winner-dialog";
import { QRScannerPlaceholder } from "@/components/lms/events/qr-scanner-placeholder";
import type { EventBingoRoundDto } from "@/lib/event-platform/bingo-rounds/bingo-round-types";
import { LMS_BOOKING_STATUSES } from "@/lib/lms-events/constants";
import { isBonusBingoCardTicket } from "@/lib/lms-events/event-wizard-input";
import type { LmsEventTicket } from "@/lib/lms-events/types";
import { formatPhone, formatPhoneDisplay, normalizeMobileForStorage } from "@/lib/phone";
import { cn } from "@/lib/utils";

/* --------------------------------- helpers -------------------------------- */

const CUSTOMER_LABELS: Record<string, string> = {
  new: "New",
  returning: "Returning",
  vip: "VIP",
  affiliate_referral: "Affiliate",
  venue_customer: "Venue",
  walk_in: "Walk-In",
};

const BONUS_TIER_STARS: Record<string, number> = {
  none: 0,
  buyer: 2,
  above_average: 3,
  power_buyer: 5,
};

const BONUS_TIER_LABEL: Record<string, string> = {
  buyer: "Buyer",
  above_average: "Above avg",
  power_buyer: "Power Buyer",
};

function rowAccentClass(bookingStatus: string): string {
  if (bookingStatus === "cancelled" || bookingStatus === "refunded") return "border-l-red-400";
  if (bookingStatus === "waitlisted") return "border-l-amber-400";
  if (bookingStatus === "no_show") return "border-l-muted-foreground/40";
  return "border-l-emerald-500";
}

function statusBadgeClass(bookingStatus: string): string {
  if (["cancelled", "refunded"].includes(bookingStatus)) return "bg-red-100 text-red-700";
  if (bookingStatus === "waitlisted") return "bg-amber-100 text-amber-700";
  if (bookingStatus === "no_show") return "bg-muted text-muted-foreground";
  return "bg-emerald-100 text-emerald-700";
}

function pct(part: number, whole: number): string {
  if (!whole) return "0%";
  return `${Math.round((part / whole) * 1000) / 10}%`;
}

function money(value: number, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "USD" }).format(value);
}

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

type EventMeta = {
  title: string;
  status: string;
  startsAt: string;
  capacity: number | null;
};

type FiltersState = {
  q: string;
  registrationStatus: string;
  checkInStatus: string;
  guestType: string;
  ticketTierId: string;
  bonusCardBuyer: string;
  sort: EventAttendeeSortField;
  pageSize: 25 | 50 | 100;
};

const DEFAULT_FILTERS: FiltersState = {
  q: "",
  registrationStatus: "all",
  checkInStatus: "all",
  guestType: "all",
  ticketTierId: "all",
  bonusCardBuyer: "all",
  sort: "registered_at",
  pageSize: 25,
};

function buildQueryString(filters: FiltersState, page: number): string {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", String(filters.pageSize));
  params.set("sort", filters.sort);
  params.set("sortDir", filters.sort === "name" ? "asc" : "desc");
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.registrationStatus !== "all") params.set("registrationStatus", filters.registrationStatus);
  if (filters.checkInStatus !== "all") params.set("checkInStatus", filters.checkInStatus);
  if (filters.guestType !== "all") {
    if (filters.guestType === "vip") params.set("customerType", "vip");
    else params.set("newOrReturning", filters.guestType);
  }
  if (filters.ticketTierId !== "all") params.set("ticketTierId", filters.ticketTierId);
  if (filters.bonusCardBuyer !== "all") params.set("bonusCardBuyer", filters.bonusCardBuyer);
  return params.toString();
}

/* --------------------------------- client --------------------------------- */

export function LmsEventAdminAttendeesClient(props: { eventId: string; embedded?: boolean }) {
  const checkInHref = `/admin/event-platform/events/${props.eventId}/check-in`;

  const [filters, setFilters] = React.useState<FiltersState>(DEFAULT_FILTERS);
  const [debouncedQ, setDebouncedQ] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [data, setData] = React.useState<EventAttendeesListResult | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [meta, setMeta] = React.useState<EventMeta | null>(null);
  const [topSpenders, setTopSpenders] = React.useState<EventAttendeeRow[]>([]);
  const [addOpen, setAddOpen] = React.useState(false);
  const [bonusOpen, setBonusOpen] = React.useState(false);
  const [bonusUnitPrice, setBonusUnitPrice] = React.useState(0);
  const [actionAttendee, setActionAttendee] = React.useState<ActionAttendee | null>(null);
  const [rowBonusOpen, setRowBonusOpen] = React.useState(false);
  const [resendOpen, setResendOpen] = React.useState(false);
  const [refundOpen, setRefundOpen] = React.useState(false);
  const [winnerOpen, setWinnerOpen] = React.useState(false);
  const [rounds, setRounds] = React.useState<EventBingoRoundDto[]>([]);

  React.useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQ(filters.q.trim()), 300);
    return () => window.clearTimeout(id);
  }, [filters.q]);

  const load = React.useCallback(async () => {
    setLoading(true);
    const qs = buildQueryString({ ...filters, q: debouncedQ }, page);
    const res = await fetch(`/api/event-platform/events/${encodeURIComponent(props.eventId)}/attendees?${qs}`, {
      credentials: "include",
      cache: "no-store",
    });
    const json = (await res.json().catch(() => null)) as (EventAttendeesListResult & { ok?: boolean; message?: string }) | null;
    if (!res.ok || !json?.ok) {
      toast.error(json?.message ?? "Could not load attendees.");
      setData(null);
    } else {
      setData(json);
    }
    setLoading(false);
  }, [props.eventId, filters, debouncedQ, page]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    setPage(1);
  }, [
    debouncedQ,
    filters.registrationStatus,
    filters.checkInStatus,
    filters.guestType,
    filters.ticketTierId,
    filters.bonusCardBuyer,
    filters.sort,
    filters.pageSize,
  ]);

  // Event meta for the header badge / capacity.
  React.useEffect(() => {
    let active = true;
    void fetch(`/api/event-platform/events/${encodeURIComponent(props.eventId)}/command-center`, {
      credentials: "include",
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((d: { ok?: boolean; summary?: { event?: EventMeta } }) => {
        if (active && d?.ok && d.summary?.event) {
          const e = d.summary.event;
          setMeta({ title: e.title, status: e.status, startsAt: e.startsAt, capacity: e.capacity });
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [props.eventId]);

  // Unfiltered top spenders for the sidebar.
  React.useEffect(() => {
    let active = true;
    void fetch(
      `/api/event-platform/events/${encodeURIComponent(props.eventId)}/attendees?pageSize=100&sort=spend&sortDir=desc`,
      { credentials: "include", cache: "no-store" },
    )
      .then((r) => r.json())
      .then((d: { ok?: boolean; rows?: EventAttendeeRow[] }) => {
        if (active && d?.ok) setTopSpenders((d.rows ?? []).filter((r) => r.totalSpend > 0).slice(0, 5));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [props.eventId]);

  // Bonus card unit price for the row-level "Sell bonus cards" action.
  React.useEffect(() => {
    let active = true;
    void fetch(`/api/lms/admin/events/${encodeURIComponent(props.eventId)}`, {
      credentials: "include",
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((d: { ok?: boolean; tickets?: LmsEventTicket[] }) => {
        if (!active || !d?.ok) return;
        const bonus = (d.tickets ?? []).find(isBonusBingoCardTicket);
        if (bonus) setBonusUnitPrice(bonus.price);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [props.eventId]);

  async function checkInOne(registrationId: string): Promise<boolean> {
    const res = await fetch(`/api/lms/admin/events/${encodeURIComponent(props.eventId)}/check-in`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ registrationId }),
    });
    const body = (await res.json().catch(() => null)) as { ok?: boolean; message?: string };
    if (!res.ok || !body?.ok) {
      toast.error(body?.message ?? "Check-in failed.");
      return false;
    }
    toast.success("Checked in.");
    return true;
  }

  function exportCsv() {
    const qs = buildQueryString({ ...filters, q: debouncedQ }, 1);
    window.open(`/api/event-platform/events/${encodeURIComponent(props.eventId)}/attendees/export?${qs}`, "_blank");
  }

  function patchFilters(patch: Partial<FiltersState>) {
    setFilters((f) => ({ ...f, ...patch }));
  }

  function toActionAttendee(row: EventAttendeeRow): ActionAttendee {
    return {
      registrationId: row.registrationId,
      fullName: row.fullName,
      email: row.email,
      currency: row.currency,
      totalSpend: row.totalSpend,
    };
  }

  function openRowBonus(row: EventAttendeeRow) {
    setActionAttendee(toActionAttendee(row));
    setRowBonusOpen(true);
  }

  function openResend(row: EventAttendeeRow) {
    setActionAttendee(toActionAttendee(row));
    setResendOpen(true);
  }

  function openRefund(row: EventAttendeeRow) {
    setActionAttendee(toActionAttendee(row));
    setRefundOpen(true);
  }

  function openRecordWinner(row: EventAttendeeRow) {
    setActionAttendee(toActionAttendee(row));
    setWinnerOpen(true);
    if (rounds.length === 0) {
      void fetch(`/api/event-platform/events/${encodeURIComponent(props.eventId)}/games`, {
        credentials: "include",
        cache: "no-store",
      })
        .then((r) => r.json())
        .then((d: { overview?: { rounds: EventBingoRoundDto[] } }) => {
          setRounds(d.overview?.rounds ?? []);
        })
        .catch(() => setRounds([]));
    }
  }

  const summary = data?.summary ?? null;
  const analytics = data?.analytics ?? null;
  const rows = data?.rows ?? [];
  const currency = analytics?.currency ?? rows[0]?.currency ?? "USD";
  const total = summary?.totalAttendees ?? 0;
  const capacity = analytics?.capacity ?? meta?.capacity ?? null;
  const capacityPct = capacity ? Math.min(100, Math.round((total / capacity) * 100)) : null;
  const maxSpend = Math.max(1, ...rows.map((r) => r.totalSpend));
  const isLive = meta ? ["in_progress", "live", "published", "open"].includes(meta.status) : false;

  const rangeStart = data ? (data.page - 1) * data.pageSize + 1 : 0;
  const rangeEnd = data ? Math.min(data.page * data.pageSize, data.total) : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Event Attendees</h1>
            {isLive ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                </span>
                Live Event
              </span>
            ) : meta ? (
              <span className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium capitalize text-muted-foreground">
                {meta.status.replace(/_/g, " ")}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {total} registered · {summary?.checkedIn ?? 0} checked in
            {capacity != null ? ` · Capacity: ${capacity}` : ""}
          </p>
          {capacityPct != null ? (
            <div className="mt-2 flex max-w-md items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${capacityPct}%` }} />
              </div>
              <span className="text-xs font-medium text-muted-foreground">{capacityPct}%</span>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={checkInHref}>
              <ScanLine className="mr-1.5 h-4 w-4" />
              Check In
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={() => toast.info("Ticket sales coming soon.")}>
            <Ticket className="mr-1.5 h-4 w-4" />
            Sell Ticket
          </Button>
          <Button variant="outline" size="sm" onClick={() => setBonusOpen(true)}>
            <Star className="mr-1.5 h-4 w-4" />
            Sell Bonus Cards
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="mr-1.5 h-4 w-4" />
                More
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={exportCsv}>Export CSV</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => toast.info("Bulk message coming soon.")}>Send message</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => void load()}>Refresh</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => setAddOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add Attendee
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-7">
        <StatCard icon={Users} tint="bg-blue-100 text-blue-600" label="Registered" value={total} hint="Total guests" />
        <StatCard icon={UserCheck} tint="bg-green-100 text-green-600" label="Checked In" value={summary?.checkedIn ?? 0} hint={pct(summary?.checkedIn ?? 0, total)} />
        <StatCard icon={UserX} tint="bg-orange-100 text-orange-600" label="Not Checked In" value={summary?.notCheckedIn ?? 0} hint={pct(summary?.notCheckedIn ?? 0, total)} />
        <StatCard icon={Crown} tint="bg-violet-100 text-violet-600" label="VIP Guests" value={analytics?.vipGuests ?? 0} hint={pct(analytics?.vipGuests ?? 0, total)} />
        <StatCard icon={Star} tint="bg-amber-100 text-amber-600" label="Bonus Card Buyers" value={summary?.bonusCardBuyers ?? 0} hint={pct(summary?.bonusCardBuyers ?? 0, total)} />
        <StatCard icon={Trophy} tint="bg-yellow-100 text-yellow-600" label="Bingo Winners" value={summary?.bingoWinnerCount ?? 0} hint="Across all rounds" />
        <StatCard icon={Ban} tint="bg-rose-100 text-rose-600" label="No Shows" value={summary?.noShows ?? 0} hint={pct(summary?.noShows ?? 0, total)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        {/* Main column */}
        <div className="min-w-0 space-y-3">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3 shadow-sm">
            <div className="relative min-w-[200px] flex-1">
              <Filter className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={filters.q}
                onChange={(e) => patchFilters({ q: e.target.value })}
                placeholder="Search name, email, or phone…"
                className="pl-9"
              />
            </div>
            <FilterSelect
              value={filters.registrationStatus}
              onValueChange={(v) => patchFilters({ registrationStatus: v })}
              placeholder="All Statuses"
              options={[{ value: "all", label: "All Statuses" }, ...LMS_BOOKING_STATUSES.map((s) => ({ value: s, label: s.replace(/_/g, " ") }))]}
            />
            <FilterSelect
              value={filters.ticketTierId}
              onValueChange={(v) => patchFilters({ ticketTierId: v })}
              placeholder="All Ticket Types"
              options={[{ value: "all", label: "All Ticket Types" }, ...(data?.ticketTiers ?? []).map((t) => ({ value: t.id, label: t.name }))]}
            />
            <FilterSelect
              value={filters.checkInStatus}
              onValueChange={(v) => patchFilters({ checkInStatus: v })}
              placeholder="All Check-in"
              options={[
                { value: "all", label: "All Check-in" },
                { value: "checked_in", label: "Checked in" },
                { value: "not_checked_in", label: "Not checked in" },
                { value: "no_show", label: "No-show" },
              ]}
            />
            <FilterSelect
              value={filters.guestType}
              onValueChange={(v) => patchFilters({ guestType: v })}
              placeholder="All Guest Types"
              options={[
                { value: "all", label: "All Guest Types" },
                { value: "vip", label: "VIP" },
                { value: "new", label: "New" },
                { value: "returning", label: "Returning" },
              ]}
            />
            <FilterSelect
              value={filters.bonusCardBuyer}
              onValueChange={(v) => patchFilters({ bonusCardBuyer: v })}
              placeholder="All Bonuses"
              options={[
                { value: "all", label: "All Bonuses" },
                { value: "true", label: "Bonus buyers" },
                { value: "false", label: "No bonus cards" },
              ]}
            />
            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => toast.info("More filters coming soon.")}>
              More Filters
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-green-600"
              onClick={() => {
                setFilters(DEFAULT_FILTERS);
              }}
            >
              Clear
            </Button>
          </div>

          {/* Sort + pagination bar */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Sort by:</span>
              <Select value={filters.sort} onValueChange={(v) => patchFilters({ sort: v as EventAttendeeSortField })}>
                <SelectTrigger className="h-9 w-[170px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="registered_at">Most Recent</SelectItem>
                  <SelectItem value="name">Alphabetical</SelectItem>
                  <SelectItem value="bonus_cards">Most bonus cards</SelectItem>
                  <SelectItem value="spend">Highest spend</SelectItem>
                  <SelectItem value="bingo_wins">Most bingo wins</SelectItem>
                  <SelectItem value="events_attended">Most events attended</SelectItem>
                </SelectContent>
              </Select>
              <span className="hidden text-sm text-muted-foreground sm:inline">
                Showing {data && data.total > 0 ? `${rangeStart} to ${rangeEnd}` : 0} of {data?.total ?? 0} attendees
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={!data || data.page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="min-w-[2rem] text-center text-sm font-medium">{data?.page ?? 1}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={!data || data.page >= data.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <Select value={String(filters.pageSize)} onValueChange={(v) => patchFilters({ pageSize: Number(v) as 25 | 50 | 100 })}>
                <SelectTrigger className="h-8 w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
                  <SelectItem value="100">100 per page</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={exportCsv}>
                <Download className="mr-1.5 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            {loading && !data ? (
              <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading attendees…
              </div>
            ) : rows.length === 0 ? (
              <p className="p-8 text-sm text-muted-foreground">No attendees match your filters.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Attendee</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Check-in</TableHead>
                      <TableHead className="hidden lg:table-cell">Tickets</TableHead>
                      <TableHead>Bonus Cards</TableHead>
                      <TableHead className="text-center">Wins</TableHead>
                      <TableHead>Total Spent</TableHead>
                      <TableHead className="hidden lg:table-cell">Guest Type</TableHead>
                      <TableHead className="w-12 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <AttendeeRow
                        key={row.registrationId}
                        row={row}
                        currency={currency}
                        maxSpend={maxSpend}
                        onCheckIn={() => void checkInOne(row.registrationId).then((ok) => { if (ok) void load(); })}
                        onSellBonus={() => openRowBonus(row)}
                        onRecordWin={() => openRecordWinner(row)}
                        onResend={() => openResend(row)}
                        onRefund={() => openRefund(row)}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <p className="border-t px-4 py-2 text-xs text-muted-foreground">
              Tip: Click any attendee to view full details and history.
            </p>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <CheckInOverviewCard
            checkedIn={summary?.checkedIn ?? 0}
            notCheckedIn={summary?.notCheckedIn ?? 0}
            noShows={summary?.noShows ?? 0}
            total={total}
          />

          <SidebarListCard title="Top Spenders">
            {topSpenders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No spend recorded yet.</p>
            ) : (
              topSpenders.map((r, i) => (
                <RankRow
                  key={r.registrationId}
                  rank={i + 1}
                  name={r.fullName}
                  avatarUrl={r.avatarUrl}
                  initials={r.initials}
                  value={money(r.totalSpend, r.currency)}
                />
              ))
            )}
          </SidebarListCard>

          <SidebarListCard title="Top Bonus Card Buyers">
            {(analytics?.topBonusBuyers ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No bonus cards sold yet.</p>
            ) : (
              (analytics?.topBonusBuyers ?? []).slice(0, 5).map((b, i) => (
                <RankRow
                  key={b.registrationId}
                  rank={i + 1}
                  name={b.name}
                  initials={initialsFrom(b.name)}
                  value={`${b.count} cards`}
                />
              ))
            )}
          </SidebarListCard>

          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold">Bulk Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              <Button asChild size="sm" className="bg-green-600 hover:bg-green-700">
                <Link href={checkInHref}>
                  <UserCheck className="mr-1.5 h-4 w-4" />
                  Check In
                </Link>
              </Button>
              <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => setBonusOpen(true)}>
                <Star className="mr-1.5 h-4 w-4" />
                Sell Bonus Cards
              </Button>
              <Button variant="outline" size="sm" onClick={() => toast.info("Bulk message coming soon.")}>
                <Send className="mr-1.5 h-4 w-4" />
                Send Message
              </Button>
              <Button variant="outline" size="sm" onClick={exportCsv}>
                <Download className="mr-1.5 h-4 w-4" />
                Export List
              </Button>
            </div>
          </div>
        </aside>
      </div>

      <AddAttendeeDrawer
        eventId={props.eventId}
        open={addOpen}
        onOpenChange={setAddOpen}
        onSaved={() => void load()}
      />

      <SellBonusCardsDrawer
        eventId={props.eventId}
        open={bonusOpen}
        onOpenChange={setBonusOpen}
        onSaved={() => void load()}
      />

      <AttendeeBonusDrawer
        open={rowBonusOpen}
        onOpenChange={setRowBonusOpen}
        eventId={props.eventId}
        attendee={actionAttendee}
        unitPrice={bonusUnitPrice}
        onSaved={() => void load()}
      />

      <ResendTicketDrawer
        open={resendOpen}
        onOpenChange={setResendOpen}
        eventId={props.eventId}
        attendee={actionAttendee}
        onSaved={() => void load()}
      />

      <IssueRefundDrawer
        open={refundOpen}
        onOpenChange={setRefundOpen}
        eventId={props.eventId}
        attendee={actionAttendee}
        onSaved={() => void load()}
      />

      <RecordWinnerDialog
        open={winnerOpen}
        onOpenChange={setWinnerOpen}
        eventId={props.eventId}
        rounds={rounds}
        defaultRegistrationId={actionAttendee?.registrationId ?? null}
        defaultRegistrationLabel={actionAttendee?.fullName ?? null}
        onSaved={() => void load()}
      />
    </div>
  );
}

/* ------------------------------ add attendee ------------------------------- */

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

function AddAttendeeDrawer(props: {
  eventId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [tiers, setTiers] = React.useState<LmsEventTicket[]>([]);
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [ticketId, setTicketId] = React.useState("");
  const [paymentMethod, setPaymentMethod] = React.useState("cash");
  const [amount, setAmount] = React.useState("");
  const [checkInNow, setCheckInNow] = React.useState(true);
  const [consent, setConsent] = React.useState(false);
  const [photo, setPhoto] = React.useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!props.open) return;
    let cancelled = false;
    void (async () => {
      const res = await fetch(`/api/lms/admin/events/${encodeURIComponent(props.eventId)}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; tickets?: LmsEventTicket[] } | null;
      if (cancelled || !res.ok || !data?.ok) return;
      const admissionTiers = (data.tickets ?? []).filter((t) => !isBonusBingoCardTicket(t));
      setTiers(admissionTiers);
      const first = admissionTiers[0];
      if (first) {
        setTicketId((prev) => prev || first.id);
        setAmount((prev) => prev || String(first.price));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [props.open, props.eventId]);

  React.useEffect(() => {
    if (props.open) return;
    // reset when closed
    setFirstName("");
    setLastName("");
    setPhone("");
    setEmail("");
    setTicketId("");
    setAmount("");
    setPaymentMethod("cash");
    setCheckInNow(true);
    setConsent(false);
    setPhoto(null);
  }, [props.open]);

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
      props.onSaved();
      props.onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Add Attendee</SheetTitle>
          <SheetDescription>Register a walk-in guest and optionally check them in.</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-3">
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
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">First name</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Last name</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="(000) 000-0000" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Email (optional)</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Ticket tier</Label>
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
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Payment</Label>
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
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Amount</Label>
              <Input type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={checkInNow} onCheckedChange={(v) => setCheckInNow(Boolean(v))} />
            Check in immediately
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={consent} onCheckedChange={(v) => setConsent(Boolean(v))} />
            Guest consents to registration &amp; communications
          </label>
        </div>

        <SheetFooter className="mt-6">
          <Button type="button" variant="outline" onClick={() => props.onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={busy || !firstName.trim() || !phone.trim() || !ticketId}
            onClick={() => void submit()}
          >
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Register attendee
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/* --------------------------- sell bonus cards ----------------------------- */

function SellBonusCardsDrawer(props: {
  eventId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [unitPrice, setUnitPrice] = React.useState(0);
  const [currency, setCurrency] = React.useState("USD");
  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [results, setResults] = React.useState<EventAttendeeRow[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [selected, setSelected] = React.useState<EventAttendeeRow | null>(null);
  const [quantity, setQuantity] = React.useState("1");
  const [paymentMethod, setPaymentMethod] = React.useState("cash");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!props.open) {
      setSearch("");
      setDebounced("");
      setResults([]);
      setSelected(null);
      setQuantity("1");
      setPaymentMethod("cash");
      return;
    }
    let cancelled = false;
    void (async () => {
      const res = await fetch(`/api/lms/admin/events/${encodeURIComponent(props.eventId)}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; tickets?: LmsEventTicket[] } | null;
      if (cancelled || !res.ok || !data?.ok) return;
      const bonus = (data.tickets ?? []).find(isBonusBingoCardTicket);
      if (bonus) {
        setUnitPrice(bonus.price);
        setCurrency(bonus.currency);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [props.open, props.eventId]);

  React.useEffect(() => {
    const t = window.setTimeout(() => setDebounced(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  React.useEffect(() => {
    if (!props.open || selected || debounced.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      setSearching(true);
      const qs = new URLSearchParams({ q: debounced, pageSize: "8" });
      const res = await fetch(
        `/api/event-platform/events/${encodeURIComponent(props.eventId)}/attendees?${qs}`,
        { credentials: "include" },
      );
      const data = (await res.json().catch(() => null)) as { ok?: boolean; rows?: EventAttendeeRow[] };
      if (!cancelled) {
        setResults(data?.ok ? (data.rows ?? []) : []);
        setSearching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [props.open, props.eventId, debounced, selected]);

  const qty = Math.max(1, Number(quantity) || 1);
  const totalAmount = unitPrice * qty;

  async function submit() {
    if (!selected) {
      toast.error("Select an attendee first.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/event-platform/events/${encodeURIComponent(props.eventId)}/live/actions`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sell_bonus_cards",
          registrationId: selected.registrationId,
          quantity: qty,
          unitPrice,
          paymentMethod,
        }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string };
      if (!res.ok || !data?.ok) {
        toast.error(data?.message ?? "Sale failed.");
        return;
      }
      toast.success("Bonus cards recorded.");
      props.onSaved();
      props.onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Sell Bonus Cards</SheetTitle>
          <SheetDescription>Search an attendee and record extra bingo card sales.</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {selected ? (
            <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/40 p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{selected.fullName}</p>
                <p className="truncate text-xs text-muted-foreground">{selected.email || "—"}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 px-2 text-muted-foreground"
                onClick={() => {
                  setSelected(null);
                  setSearch("");
                }}
              >
                <X className="h-3.5 w-3.5" />
                Change
              </Button>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Attendee</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Name, email, or phone…"
                  className="pl-9"
                />
              </div>
              {searching ? (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> Searching…
                </p>
              ) : null}
              {results.length > 0 ? (
                <div className="max-h-40 overflow-y-auto rounded-md border">
                  {results.map((a) => (
                    <button
                      key={a.registrationId}
                      type="button"
                      className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-muted"
                      onClick={() => {
                        setSelected(a);
                        setResults([]);
                      }}
                    >
                      <span className="font-medium">{a.fullName}</span>
                      <span className="text-xs text-muted-foreground">{a.email || a.phone || "—"}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Quantity</Label>
              <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Unit price</Label>
              <Input readOnly value={unitPrice.toFixed(2)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Payment</Label>
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
          </div>

          <p className="text-sm font-medium">Total: {money(totalAmount, currency)}</p>
        </div>

        <SheetFooter className="mt-6">
          <Button type="button" variant="outline" onClick={() => props.onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={busy || !selected} onClick={() => void submit()}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Complete Sale
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/* -------------------------------- sub views -------------------------------- */

function StatCard(props: {
  icon: React.ComponentType<{ className?: string }>;
  tint: string;
  label: string;
  value: number | string;
  hint: string;
  progress?: number | null;
  progressColor?: string;
}) {
  const Icon = props.icon;
  return (
    <div className="rounded-xl border bg-card p-3 shadow-sm">
      <div className={cn("mb-2 flex h-8 w-8 items-center justify-center rounded-lg", props.tint)}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-2xl font-bold leading-none tabular-nums">{props.value}</p>
      <p className="mt-1 truncate text-[11px] font-medium text-muted-foreground">{props.label}</p>
      <p className="text-[11px] text-muted-foreground">{props.hint}</p>
      {props.progress != null ? (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full", props.progressColor ?? "bg-green-500")}
            style={{ width: `${Math.min(100, Math.max(0, props.progress))}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}

function FilterSelect(props: {
  value: string;
  onValueChange: (v: string) => void;
  placeholder: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <Select value={props.value} onValueChange={props.onValueChange}>
      <SelectTrigger className="h-9 w-auto min-w-[130px] capitalize">
        <SelectValue placeholder={props.placeholder} />
      </SelectTrigger>
      <SelectContent>
        {props.options.map((o) => (
          <SelectItem key={o.value} value={o.value} className="capitalize">
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function AttendeeRow(props: {
  row: EventAttendeeRow;
  currency: string;
  maxSpend: number;
  onCheckIn: () => void;
  onSellBonus: () => void;
  onRecordWin: () => void;
  onResend: () => void;
  onRefund: () => void;
}) {
  const { row } = props;
  const isVip = row.customerType === "vip";
  const stars = BONUS_TIER_STARS[row.bonus.tier] ?? 0;

  return (
    <TableRow className={cn("border-l-4", rowAccentClass(row.bookingStatus))}>
      <TableCell>
        <div className="flex items-center gap-2.5">
          <Avatar className="h-9 w-9">
            {row.avatarUrl ? <AvatarImage src={row.avatarUrl} alt="" /> : null}
            <AvatarFallback className="text-xs">{row.initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-medium">{row.fullName}</p>
            <p className="truncate text-xs text-muted-foreground">{row.email}</p>
            {row.phone ? (
              <p className="truncate text-xs text-muted-foreground">{formatPhoneDisplay(row.phone, "—")}</p>
            ) : null}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col items-start gap-1">
          <Badge className={cn("border-0 text-[10px] font-medium capitalize", statusBadgeClass(row.bookingStatus))}>
            {row.bookingStatus.replace(/_/g, " ")}
          </Badge>
          {isVip ? (
            <Badge className="h-4 gap-0.5 border-0 bg-violet-100 px-1 text-[9px] font-semibold text-violet-700">
              <Crown className="h-2.5 w-2.5" />
              VIP
            </Badge>
          ) : row.customerType === "returning" ? (
            <span className="text-[10px] text-muted-foreground">Returning</span>
          ) : row.customerType === "new" ? (
            <span className="text-[10px] text-muted-foreground">New</span>
          ) : null}
        </div>
      </TableCell>
      <TableCell>
        {row.checkInStatus === "checked_in" ? (
          <div>
            <Badge className="border-0 bg-emerald-100 text-[10px] font-medium text-emerald-700">Checked In</Badge>
            {row.checkedInAt ? (
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {new Date(row.checkedInAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
              </p>
            ) : null}
          </div>
        ) : (
          <Badge className="border-0 bg-rose-100 text-[10px] font-medium text-rose-600">
            {row.checkInStatus === "no_show" ? "No-show" : "Not Checked In"}
          </Badge>
        )}
      </TableCell>
      <TableCell className="hidden lg:table-cell">
        <p className="text-sm font-medium tabular-nums">{row.ticketQuantity}</p>
        <p className="text-[10px] text-muted-foreground">{row.ticketName}</p>
      </TableCell>
      <TableCell>
        {row.bonusCards > 0 ? (
          <div className="space-y-0.5">
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={cn("h-3 w-3", i < stars ? "fill-amber-400 text-amber-400" : "fill-muted text-muted")}
                />
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">{row.bonusCards} Cards</p>
            {BONUS_TIER_LABEL[row.bonus.tier] === "Power Buyer" ? (
              <p className="text-[10px] font-semibold text-rose-500">Power Buyer</p>
            ) : BONUS_TIER_LABEL[row.bonus.tier] ? (
              <p className="text-[10px] text-muted-foreground">{BONUS_TIER_LABEL[row.bonus.tier]}</p>
            ) : null}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">0 Cards</span>
        )}
      </TableCell>
      <TableCell className="text-center">
        {row.bingoWinCount > 0 ? (
          <span className="inline-flex items-center gap-1">
            <Trophy className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-sm font-semibold tabular-nums">{row.bingoWinCount}</span>
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">0</span>
        )}
      </TableCell>
      <TableCell>
        <p className="text-sm font-semibold tabular-nums">{money(row.totalSpend, row.currency)}</p>
        <div className="mt-1 h-1.5 w-16 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-emerald-500"
            style={{ width: `${Math.min(100, (row.totalSpend / props.maxSpend) * 100)}%` }}
          />
        </div>
      </TableCell>
      <TableCell className="hidden lg:table-cell">
        {isVip ? (
          <Badge className="border-0 bg-violet-100 text-[10px] font-medium text-violet-700">VIP Customer</Badge>
        ) : row.customerType === "affiliate_referral" ? (
          <Badge variant="outline" className="text-[10px]">Affiliate</Badge>
        ) : (
          <span className="text-xs text-muted-foreground">{CUSTOMER_LABELS[row.customerType] ?? "Regular"}</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <TableActionButton
          label="Actions"
          items={[
            {
              label: "Check in",
              onSelect: props.onCheckIn,
              disabled: row.checkInStatus === "checked_in",
            },
            { label: "Sell bonus cards", onSelect: props.onSellBonus },
            { label: "Record bingo win", onSelect: props.onRecordWin },
            { label: "Resend ticket", onSelect: props.onResend },
            {
              label: "Issue refund",
              onSelect: props.onRefund,
              disabled: row.bookingStatus === "refunded" || row.bookingStatus === "cancelled",
            },
          ]}
        />
      </TableCell>
    </TableRow>
  );
}

function CheckInOverviewCard(props: { checkedIn: number; notCheckedIn: number; noShows: number; total: number }) {
  const segments = [
    { value: props.checkedIn, color: "#22c55e", label: "Checked in" },
    { value: props.notCheckedIn, color: "#f59e0b", label: "Not Checked in" },
    { value: props.noShows, color: "#cbd5e1", label: "No Show" },
  ];
  const sum = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = 52;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold">Check-in Overview</h3>
      <div className="flex items-center gap-4">
        <div className="relative h-32 w-32 shrink-0">
          <svg viewBox="0 0 120 120" className="h-32 w-32 -rotate-90">
            <circle cx="60" cy="60" r={r} fill="none" stroke="#f1f5f9" strokeWidth="12" />
            {segments.map((s) => {
              const len = (s.value / sum) * c;
              const el = (
                <circle
                  key={s.label}
                  cx="60"
                  cy="60"
                  r={r}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="12"
                  strokeDasharray={`${len} ${c - len}`}
                  strokeDashoffset={-offset}
                  strokeLinecap="butt"
                />
              );
              offset += len;
              return el;
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold leading-none tabular-nums">{props.checkedIn}</span>
            <span className="text-[10px] text-muted-foreground">Checked in</span>
          </div>
        </div>
        <ul className="space-y-1.5 text-sm">
          {segments.map((s) => (
            <li key={s.label} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="text-muted-foreground">{s.label}</span>
              <span className="font-semibold tabular-nums">({s.value})</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{pct(props.checkedIn, props.total)} of attendees</p>
    </div>
  );
}

function SidebarListCard(props: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{props.title}</h3>
        <span className="text-xs font-medium text-green-600">View all</span>
      </div>
      <div className="space-y-2.5">{props.children}</div>
    </div>
  );
}

function RankRow(props: {
  rank: number;
  name: string;
  avatarUrl?: string | null;
  initials: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-4 text-center text-xs font-semibold text-muted-foreground">{props.rank}</span>
      <Avatar className="h-7 w-7">
        {props.avatarUrl ? <AvatarImage src={props.avatarUrl} alt="" /> : null}
        <AvatarFallback className="text-[10px]">{props.initials}</AvatarFallback>
      </Avatar>
      <span className="min-w-0 flex-1 truncate text-sm">{props.name}</span>
      <span className="shrink-0 text-sm font-semibold tabular-nums">{props.value}</span>
    </div>
  );
}

/* --------------------------------- check-in -------------------------------- */

export function LmsEventAdminCheckInClient(props: { eventId: string; compact?: boolean }) {
  const compact = props.compact ?? false;
  const attendeesHref = `/admin/event-platform/events/${props.eventId}/attendees`;

  const [qrToken, setQrToken] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [data, setData] = React.useState<EventAttendeesListResult | null>(null);
  const [recent, setRecent] = React.useState<EventAttendeeRow[]>([]);
  const [meta, setMeta] = React.useState<EventMeta | null>(null);
  const [lastUpdated, setLastUpdated] = React.useState<Date | null>(null);

  const loadSummary = React.useCallback(async () => {
    const res = await fetch(`/api/event-platform/events/${encodeURIComponent(props.eventId)}/attendees?pageSize=25`, {
      credentials: "include",
      cache: "no-store",
    });
    const json = (await res.json().catch(() => null)) as (EventAttendeesListResult & { ok?: boolean }) | null;
    if (res.ok && json?.ok) {
      setData(json);
      setLastUpdated(new Date());
    }
  }, [props.eventId]);

  const loadRecent = React.useCallback(async () => {
    const res = await fetch(
      `/api/event-platform/events/${encodeURIComponent(props.eventId)}/attendees?checkInStatus=checked_in&pageSize=100`,
      { credentials: "include", cache: "no-store" },
    );
    const json = (await res.json().catch(() => null)) as { ok?: boolean; rows?: EventAttendeeRow[] } | null;
    if (res.ok && json?.ok) {
      const sorted = (json.rows ?? [])
        .filter((r) => r.checkedInAt)
        .sort((a, b) => new Date(b.checkedInAt ?? 0).getTime() - new Date(a.checkedInAt ?? 0).getTime());
      setRecent(sorted.slice(0, 6));
    }
  }, [props.eventId]);

  const reload = React.useCallback(() => {
    void loadSummary();
    void loadRecent();
  }, [loadSummary, loadRecent]);

  React.useEffect(() => {
    reload();
  }, [reload]);

  React.useEffect(() => {
    let active = true;
    void fetch(`/api/event-platform/events/${encodeURIComponent(props.eventId)}/command-center`, {
      credentials: "include",
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((d: { ok?: boolean; summary?: { event?: EventMeta } }) => {
        if (active && d?.ok && d.summary?.event) {
          const e = d.summary.event;
          setMeta({ title: e.title, status: e.status, startsAt: e.startsAt, capacity: e.capacity });
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [props.eventId]);

  async function checkIn(body: { qrToken?: string; query?: string }) {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/lms/admin/events/${encodeURIComponent(props.eventId)}/check-in`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const resp = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!res.ok || !resp?.ok) {
        toast.error(resp?.message ?? "Check-in failed.");
        return;
      }
      toast.success("Attendee checked in.");
      setQrToken("");
      setQuery("");
      reload();
    } finally {
      setSubmitting(false);
    }
  }

  const summary = data?.summary ?? null;
  const analytics = data?.analytics ?? null;
  const total = summary?.totalAttendees ?? 0;
  const checkedIn = summary?.checkedIn ?? 0;
  const notCheckedIn = summary?.notCheckedIn ?? 0;
  const noShows = summary?.noShows ?? 0;
  const capacity = analytics?.capacity ?? meta?.capacity ?? null;
  const isLive = meta ? ["in_progress", "live", "published", "open"].includes(meta.status) : false;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Event Check-In</h1>
          {isLive ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
              Live Mode
            </span>
          ) : meta ? (
            <span className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium capitalize text-muted-foreground">
              {meta.status.replace(/_/g, " ")}
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Scan a ticket or search manually to check in attendees.</p>
      </div>

      {/* Stats + overview */}
      <div className={cn("grid gap-4", compact ? "grid-cols-1" : "xl:grid-cols-[1fr_300px]")}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard
            icon={UserCheck}
            tint="bg-green-100 text-green-600"
            label="Checked In"
            value={checkedIn}
            hint={pct(checkedIn, total)}
            progress={total ? (checkedIn / total) * 100 : 0}
            progressColor="bg-green-500"
          />
          <StatCard
            icon={UserX}
            tint="bg-orange-100 text-orange-600"
            label="Not Checked In"
            value={notCheckedIn}
            hint={pct(notCheckedIn, total)}
            progress={total ? (notCheckedIn / total) * 100 : 0}
            progressColor="bg-orange-500"
          />
          <StatCard
            icon={Users}
            tint="bg-blue-100 text-blue-600"
            label="Total Registered"
            value={total}
            hint={capacity != null ? `Capacity: ${capacity}` : "Registered"}
          />
          <StatCard
            icon={UserPlus}
            tint="bg-violet-100 text-violet-600"
            label="Walk-Ins"
            value={summary?.walkInCount ?? 0}
            hint="Today"
          />
          <StatCard
            icon={Star}
            tint="bg-amber-100 text-amber-600"
            label="Bonus Card Buyers"
            value={summary?.bonusCardBuyers ?? 0}
            hint={pct(summary?.bonusCardBuyers ?? 0, total)}
          />
          <StatCard
            icon={Ban}
            tint="bg-rose-100 text-rose-600"
            label="No Shows"
            value={noShows}
            hint={pct(noShows, total)}
          />
        </div>
        <CheckInOverviewCard checkedIn={checkedIn} notCheckedIn={notCheckedIn} noShows={noShows} total={total} />
      </div>

      {/* Scanner + manual entry */}
      <div className={cn("grid gap-4", !compact && "lg:grid-cols-2")}>
        <QRScannerPlaceholder
          disabled={submitting}
          onScan={(token) => {
            if (submitting) return;
            void checkIn({ qrToken: token });
          }}
        />

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <h3 className="text-sm font-semibold">Enter ticket or search manually</h3>
          <div className="mt-4 space-y-2">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="qr-token">
              Scan / Enter QR token or ticket code
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <ScanLine className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="qr-token"
                  className="pl-9"
                  value={qrToken}
                  onChange={(e) => setQrToken(e.target.value)}
                  placeholder="QR-EVT-…"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && qrToken.trim()) void checkIn({ qrToken });
                  }}
                />
              </div>
              <Button
                type="button"
                className="bg-green-600 hover:bg-green-700"
                disabled={submitting || !qrToken.trim()}
                onClick={() => void checkIn({ qrToken })}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check in"}
              </Button>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="manual-search">
              Manual search by name or email
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="manual-search"
                  className="pl-9"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search name or email…"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && query.trim()) void checkIn({ query });
                  }}
                />
              </div>
              <Button
                type="button"
                className="bg-green-600 hover:bg-green-700"
                disabled={submitting || !query.trim()}
                onClick={() => void checkIn({ query })}
              >
                Find &amp; check in
              </Button>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Tip: You can also search by phone number.
          </div>
        </div>
      </div>

      {/* Recent check-ins + quick actions */}
      <div className={cn("grid gap-4", !compact && "lg:grid-cols-2")}>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Recent Check-Ins</h3>
            <Link href={attendeesHref} className="text-xs font-medium text-green-600">
              View all
            </Link>
          </div>
          <ul className="space-y-1">
            {recent.map((r) => (
              <li key={r.registrationId} className="flex items-center gap-3 rounded-lg px-1 py-1.5">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                <Avatar className="h-8 w-8">
                  {r.avatarUrl ? <AvatarImage src={r.avatarUrl} alt="" /> : null}
                  <AvatarFallback className="text-[10px]">{r.initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{r.fullName}</p>
                  <p className="truncate text-xs text-muted-foreground">{r.email}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs font-medium">
                    {r.checkedInAt
                      ? new Date(r.checkedInAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
                      : "—"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Today</p>
                </div>
                <div className="hidden shrink-0 text-right sm:block">
                  <p className="text-xs font-medium tabular-nums">{r.ticketQuantity} Tickets</p>
                  <p className="text-[10px] text-muted-foreground">{r.ticketName}</p>
                </div>
              </li>
            ))}
            {recent.length === 0 ? <li className="py-2 text-sm text-muted-foreground">No check-ins yet.</li> : null}
          </ul>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold">Quick Actions</h3>
          <div className="space-y-2">
            <QuickAction
              icon={UserPlus}
              tint="bg-green-100 text-green-600"
              title="Check-in Walk-In Attendee"
              subtitle="Manually add and check in a walk-in guest"
              onClick={() => toast.info("Walk-in check-in coming soon.")}
            />
            <QuickAction
              icon={List}
              tint="bg-blue-100 text-blue-600"
              title="View Attendee List"
              subtitle="Browse all registered attendees"
              href={attendeesHref}
            />
            <QuickAction
              icon={Star}
              tint="bg-amber-100 text-amber-600"
              title="Sell Bonus Cards"
              subtitle="Sell bonus cards to a checked-in attendee"
              onClick={() => toast.info("Bonus card sales coming soon.")}
            />
            <QuickAction
              icon={Megaphone}
              tint="bg-violet-100 text-violet-600"
              title="Send Announcement"
              subtitle="Send a message to all attendees"
              onClick={() => toast.info("Announcements coming soon.")}
            />
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t pt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          Live mode: <span className="font-semibold text-foreground">ON</span>
        </span>
        <span className="flex items-center gap-1.5">
          <ScanLine className="h-3.5 w-3.5 text-green-500" />
          Scanner: <span className="font-semibold text-foreground">Connected</span>
        </span>
        <button
          type="button"
          onClick={reload}
          className="flex items-center gap-1.5 hover:text-foreground"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "—"}
        </button>
      </div>
    </div>
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
  const Icon = props.icon;
  const inner = (
    <>
      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", props.tint)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{props.title}</p>
        <p className="truncate text-xs text-muted-foreground">{props.subtitle}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </>
  );
  const className =
    "flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left transition-colors hover:bg-accent";
  if (props.href) {
    return (
      <Link href={props.href} className={className}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" className={className} onClick={props.onClick}>
      {inner}
    </button>
  );
}
