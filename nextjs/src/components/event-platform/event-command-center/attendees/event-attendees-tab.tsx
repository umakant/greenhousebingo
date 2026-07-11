"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  Crown,
  Download,
  Leaf,
  ListFilter,
  Loader2,
  Mail,
  Phone,
  Search,
  Star,
  Trophy,
  X,
} from "lucide-react";
import { toast } from "sonner";

import type { ActionAttendee } from "@/components/event-platform/event-command-center/attendees/attendee-action-drawers";
import {
  IssueRefundDrawer,
  ResendTicketDrawer,
  SellBonusCardsDrawer,
} from "@/components/event-platform/event-command-center/attendees/attendee-action-drawers";
import { AttendeeDrawer } from "@/components/event-platform/event-command-center/attendees/attendee-drawer";
import {
  AttendeeAnalyticsPanels,
} from "@/components/event-platform/event-command-center/attendees/attendee-analytics-panels";
import {
  AttendeeQuickInsights,
  AttendeeSummaryPanels,
} from "@/components/event-platform/event-command-center/attendees/attendee-summary-cards";
import { useEventCommandCenter } from "@/components/event-platform/event-command-center/event-command-center-context";
import { RecordWinnerDialog } from "@/components/event-platform/event-command-center/games/record-winner-dialog";
import { PlantRequestDialog } from "@/components/event-platform/event-command-center/plants/plant-request-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import type { EventBingoRoundDto } from "@/lib/event-platform/bingo-rounds/bingo-round-types";
import type { EventPlantDto } from "@/lib/event-platform/event-plants/event-plant-types";
import { isBonusBingoCardTicket } from "@/lib/lms-events/event-wizard-input";
import { LMS_BOOKING_STATUSES } from "@/lib/lms-events/constants";
import { formatPhoneDisplay } from "@/lib/phone";
import { cn } from "@/lib/utils";

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

/** Left-border accent color based on registration status. */
function rowAccentClass(bookingStatus: string): string {
  if (bookingStatus === "cancelled" || bookingStatus === "refunded") return "border-l-red-400";
  if (bookingStatus === "waitlisted") return "border-l-amber-400";
  if (bookingStatus === "no_show") return "border-l-muted-foreground/40";
  return "border-l-emerald-400";
}

const PLANT_BADGE_CLASS =
  "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";

type FiltersState = {
  q: string;
  registrationStatus: string;
  checkInStatus: string;
  newOrReturning: string;
  customerType: string;
  ticketTierId: string;
  bonusCardBuyer: string;
  registrationSource: string;
  sort: EventAttendeeSortField;
  sortDir: "asc" | "desc";
  pageSize: 25 | 50 | 100;
};

const DEFAULT_FILTERS: FiltersState = {
  q: "",
  registrationStatus: "all",
  checkInStatus: "all",
  newOrReturning: "all",
  customerType: "all",
  ticketTierId: "all",
  bonusCardBuyer: "all",
  registrationSource: "all",
  sort: "registered_at",
  sortDir: "desc",
  pageSize: 25,
};

function buildQueryString(eventId: string, filters: FiltersState, page: number, guestsOnly = false): string {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", String(filters.pageSize));
  if (guestsOnly) params.set("guestsOnly", "true");
  params.set("sort", filters.sort);
  params.set("sortDir", filters.sortDir);
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.registrationStatus !== "all") params.set("registrationStatus", filters.registrationStatus);
  if (filters.checkInStatus !== "all") params.set("checkInStatus", filters.checkInStatus);
  if (filters.newOrReturning !== "all") params.set("newOrReturning", filters.newOrReturning);
  if (filters.customerType !== "all") params.set("customerType", filters.customerType);
  if (filters.ticketTierId !== "all") params.set("ticketTierId", filters.ticketTierId);
  if (filters.bonusCardBuyer !== "all") params.set("bonusCardBuyer", filters.bonusCardBuyer);
  if (filters.registrationSource !== "all") params.set("registrationSource", filters.registrationSource);
  return params.toString();
}

function FilterField({
  label,
  children,
  className,
  inline = false,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  inline?: boolean;
}) {
  if (inline) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <span className="whitespace-nowrap text-xs font-medium text-muted-foreground">{label}</span>
        {children}
      </div>
    );
  }
  return (
    <div className={cn("space-y-1", className)}>
      <label className="block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

export function EventAttendeesTab(props: { eventId: string; variant?: "attendees" | "guests" }) {
  const isGuests = props.variant === "guests";
  const noun = isGuests
    ? { singular: "guest", plural: "guests", Title: "Guest" }
    : { singular: "attendee", plural: "attendees", Title: "Attendee" };
  const { summary: ccSummary, tickets } = useEventCommandCenter();
  const bonusUnitPrice = React.useMemo(() => {
    const bonus = tickets.find(isBonusBingoCardTicket);
    return bonus ? bonus.price : 0;
  }, [tickets]);
  const netProfit =
    ccSummary?.financial.netProfit.availability === "available"
      ? ccSummary.financial.netProfit.value
      : null;
  const [filters, setFilters] = React.useState<FiltersState>(DEFAULT_FILTERS);
  const [debouncedQ, setDebouncedQ] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [data, setData] = React.useState<EventAttendeesListResult | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [drawerId, setDrawerId] = React.useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [bulkBusy, setBulkBusy] = React.useState(false);
  const [plantRequestOpen, setPlantRequestOpen] = React.useState(false);
  const [plantRequestReg, setPlantRequestReg] = React.useState<{ id: string; label: string } | null>(null);
  const [inventoryPlants, setInventoryPlants] = React.useState<EventPlantDto[]>([]);
  const [actionAttendee, setActionAttendee] = React.useState<ActionAttendee | null>(null);
  const [bonusOpen, setBonusOpen] = React.useState(false);
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
    const qs = buildQueryString(props.eventId, { ...filters, q: debouncedQ }, page, isGuests);
    const res = await fetch(`/api/event-platform/events/${encodeURIComponent(props.eventId)}/attendees?${qs}`, {
      credentials: "include",
      cache: "no-store",
    });
    const json = (await res.json().catch(() => null)) as EventAttendeesListResult & { ok?: boolean; message?: string };
    if (!res.ok || !json.ok) {
      toast.error(json.message ?? `Could not load ${noun.plural}.`);
      setData(null);
    } else {
      setData(json);
      setSelected(new Set());
    }
    setLoading(false);
  }, [props.eventId, filters, debouncedQ, page, isGuests, noun.plural]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    setPage(1);
  }, [debouncedQ, filters.registrationStatus, filters.checkInStatus, filters.newOrReturning, filters.customerType, filters.ticketTierId, filters.bonusCardBuyer, filters.registrationSource, filters.sort, filters.sortDir, filters.pageSize]);

  const rows = data?.rows ?? [];
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.registrationId));

  async function checkInOne(registrationId: string) {
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

  async function bulkCheckIn() {
    if (!selected.size) return;
    setBulkBusy(true);
    let ok = 0;
    for (const id of selected) {
      if (await checkInOne(id)) ok += 1;
    }
    setBulkBusy(false);
    toast.success(`Checked in ${ok} ${noun.singular}(s).`);
    void load();
  }

  function exportCsv() {
    const qs = buildQueryString(props.eventId, { ...filters, q: debouncedQ }, 1, isGuests);
    window.open(`/api/event-platform/events/${encodeURIComponent(props.eventId)}/attendees/export?${qs}`, "_blank");
  }

  function openPlantRequest(row: EventAttendeeRow) {
    setPlantRequestReg({ id: row.registrationId, label: row.fullName });
    setPlantRequestOpen(true);
    void fetch(`/api/event-platform/events/${encodeURIComponent(props.eventId)}/plants`, {
      credentials: "include",
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((d: { overview?: { plants: EventPlantDto[] } }) => {
        setInventoryPlants(d.overview?.plants.filter((p) => p.status !== "removed") ?? []);
      })
      .catch(() => setInventoryPlants([]));
  }

  function openDrawer(row: EventAttendeeRow) {
    setDrawerId(row.registrationId);
    setDrawerOpen(true);
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

  function openSellBonus(row: EventAttendeeRow) {
    setActionAttendee(toActionAttendee(row));
    setBonusOpen(true);
  }

  function openResendTicket(row: EventAttendeeRow) {
    setActionAttendee(toActionAttendee(row));
    setResendOpen(true);
  }

  function openIssueRefund(row: EventAttendeeRow) {
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

  function patchFilters(patch: Partial<FiltersState>) {
    setFilters((f) => ({ ...f, ...patch }));
  }

  const activeFilterCount =
    (filters.q.trim() ? 1 : 0) +
    (filters.registrationStatus !== "all" ? 1 : 0) +
    (filters.checkInStatus !== "all" ? 1 : 0) +
    (filters.newOrReturning !== "all" ? 1 : 0) +
    (filters.customerType !== "all" ? 1 : 0) +
    (filters.ticketTierId !== "all" ? 1 : 0) +
    (filters.bonusCardBuyer !== "all" ? 1 : 0) +
    (filters.registrationSource !== "all" ? 1 : 0);

  function clearFilters() {
    setFilters((f) => ({
      ...f,
      q: "",
      registrationStatus: "all",
      checkInStatus: "all",
      newOrReturning: "all",
      customerType: "all",
      ticketTierId: "all",
      bonusCardBuyer: "all",
      registrationSource: "all",
    }));
  }

  const maxSpend = Math.max(1, ...rows.map((r) => r.totalSpend));

  return (
    <div className="space-y-4">
      <AttendeeSummaryPanels
        summary={data?.summary ?? null}
        analytics={data?.analytics ?? null}
        netProfit={netProfit}
        loading={loading && !data}
      />

      <AttendeeQuickInsights summary={data?.summary ?? null} analytics={data?.analytics ?? null} />

      <div className="rounded-xl border bg-card p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filters.q}
              onChange={(e) => patchFilters({ q: e.target.value })}
              placeholder="Search name, email, or phone…"
              className="h-10 pl-9"
            />
            {filters.q ? (
              <button
                type="button"
                onClick={() => patchFilters({ q: "" })}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-sm text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <ListFilter className="h-4 w-4" />
              <span className="hidden sm:inline">Filters</span>
              {activeFilterCount > 0 ? (
                <Badge variant="secondary" className="h-5 rounded-full px-1.5 text-xs">
                  {activeFilterCount}
                </Badge>
              ) : null}
            </div>
            {activeFilterCount > 0 ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 gap-1 text-muted-foreground hover:text-foreground"
                onClick={clearFilters}
              >
                <X className="h-3.5 w-3.5" />
                Clear
              </Button>
            ) : null}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          <FilterField label="Status">
            <Select value={filters.registrationStatus} onValueChange={(v) => patchFilters({ registrationStatus: v })}>
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="Registration status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {LMS_BOOKING_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Check-In">
            <Select value={filters.checkInStatus} onValueChange={(v) => patchFilters({ checkInStatus: v })}>
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="Check-in" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All check-in</SelectItem>
                <SelectItem value="checked_in">Checked in</SelectItem>
                <SelectItem value="not_checked_in">Not checked in</SelectItem>
                <SelectItem value="no_show">No-show</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Guests">
            <Select value={filters.newOrReturning} onValueChange={(v) => patchFilters({ newOrReturning: v })}>
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="New / returning" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All guests</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="returning">Returning</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Type">
            <Select value={filters.customerType} onValueChange={(v) => patchFilters({ customerType: v })}>
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="Customer type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="returning">Returning</SelectItem>
                <SelectItem value="affiliate_referral">Affiliate</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Ticket Tier">
            <Select value={filters.ticketTierId} onValueChange={(v) => patchFilters({ ticketTierId: v })}>
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="Ticket tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tiers</SelectItem>
                {(data?.ticketTiers ?? []).map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Bonus Cards">
            <Select value={filters.bonusCardBuyer} onValueChange={(v) => patchFilters({ bonusCardBuyer: v })}>
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="Bonus cards" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="true">Bonus buyers</SelectItem>
                <SelectItem value="false">No bonus cards</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>
        </div>

        <div className="mt-3 flex flex-col gap-2 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
          <FilterField label="Sort By" className="sm:w-[220px]" inline>
            <Select value={filters.sort} onValueChange={(v) => patchFilters({ sort: v as EventAttendeeSortField })}>
              <SelectTrigger className="h-9 w-full sm:w-[200px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="registered_at">Most recent registration</SelectItem>
                <SelectItem value="name">Alphabetical</SelectItem>
                <SelectItem value="bonus_cards">Most bonus cards</SelectItem>
                <SelectItem value="spend">Highest spend</SelectItem>
                <SelectItem value="bingo_wins">Most bingo wins</SelectItem>
                <SelectItem value="events_attended">Most events attended</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Show" className="sm:w-auto" inline>
            <Select value={filters.pageSize.toString()} onValueChange={(v) => patchFilters({ pageSize: Number(v) as 25 | 50 | 100 })}>
              <SelectTrigger className="h-9 w-full sm:w-[90px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>
        </div>
      </div>

      {selected.size > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <Button type="button" size="sm" variant="secondary" disabled={bulkBusy} onClick={() => void bulkCheckIn()}>
            Check in
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => toast.info("Email coming soon.")}>
            Send email
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => toast.info("WhatsApp coming soon.")}>
            Send WhatsApp
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={exportCsv}>
            <Download className="mr-1.5 h-4 w-4" />
            Export selected
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => toast.info("No-show marking coming soon.")}>
            Mark no-show
          </Button>
        </div>
      ) : null}

      <div className="rounded-lg border shadow-sm">
        {loading ? (
          <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading {noun.plural}…
          </div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-sm text-muted-foreground">
            {isGuests ? (
              <div className="space-y-1">
                <p className="font-medium text-foreground">No guests yet</p>
                <p>
                  Guests are walk-in registrations added at the door. Use the walk-in action in Live
                  Mode or the Attendees tab to register on-site guests, and they will appear here.
                </p>
              </div>
            ) : (
              <p>No {noun.plural} match your filters.</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={(v) => {
                        if (v) setSelected(new Set(rows.map((r) => r.registrationId)));
                        else setSelected(new Set());
                      }}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead>{noun.Title}</TableHead>
                  <TableHead className="hidden md:table-cell">Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Check-In</TableHead>
                  <TableHead className="hidden lg:table-cell">Tickets</TableHead>
                  <TableHead>Bonus Cards</TableHead>
                  <TableHead className="hidden lg:table-cell">Plant Request</TableHead>
                  <TableHead className="hidden xl:table-cell text-center">Wins</TableHead>
                  <TableHead>Total Spend</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const isVip = row.customerType === "vip";
                  const stars = BONUS_TIER_STARS[row.bonus.tier] ?? 0;
                  const plantValue =
                    row.plantRequest.availability === "available" ? row.plantRequest.value : null;
                  return (
                  <TableRow
                    key={row.registrationId}
                    className={cn("cursor-pointer border-l-2", rowAccentClass(row.bookingStatus))}
                    onClick={() => openDrawer(row)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selected.has(row.registrationId)}
                        onCheckedChange={(v) => {
                          setSelected((prev) => {
                            const next = new Set(prev);
                            if (v) next.add(row.registrationId);
                            else next.delete(row.registrationId);
                            return next;
                          });
                        }}
                        aria-label={`Select ${row.fullName}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-9 w-9">
                          {row.avatarUrl ? <AvatarImage src={row.avatarUrl} alt="" /> : null}
                          <AvatarFallback className="text-xs">{row.initials}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate font-medium">{row.fullName}</p>
                            {isVip ? (
                              <Badge className="h-4 gap-0.5 border-0 bg-rose-500/15 px-1 text-[9px] font-semibold text-rose-600 dark:text-rose-400">
                                <Crown className="h-2.5 w-2.5" />
                                VIP
                              </Badge>
                            ) : null}
                          </div>
                          <p className="truncate text-xs text-muted-foreground">
                            {CUSTOMER_LABELS[row.customerType] ?? row.customerType}
                            {" · "}
                            {row.registrationSource}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="space-y-0.5 text-xs">
                        {row.phone ? (
                          <p className="flex items-center gap-1 text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {formatPhoneDisplay(row.phone, "—")}
                          </p>
                        ) : null}
                        <p className="flex max-w-[190px] items-center gap-1 text-muted-foreground">
                          <Mail className="h-3 w-3 shrink-0" />
                          <span className="truncate">{row.email}</span>
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize text-[10px]">
                        {row.bookingStatus.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {row.checkInStatus === "checked_in" ? (
                        <div className="text-xs">
                          <Badge className="border-0 bg-emerald-500/15 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                            Checked In
                          </Badge>
                          {row.checkedInAt ? (
                            <p className="mt-0.5 text-[10px] text-muted-foreground">
                              {new Date(row.checkedInAt).toLocaleString(undefined, {
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-[10px] text-muted-foreground"
                        >
                          {row.checkInStatus === "no_show" ? "No-show" : "Not Checked In"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <p className="text-sm">{row.ticketName}</p>
                      <p className="text-[10px] text-muted-foreground">{row.totalCards} cards</p>
                    </TableCell>
                    <TableCell>
                      {row.bonusCards > 0 ? (
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={cn(
                                  "h-3 w-3",
                                  i < stars
                                    ? "fill-amber-400 text-amber-400"
                                    : "fill-muted text-muted",
                                )}
                              />
                            ))}
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            {row.bonusCards} Cards
                            {BONUS_TIER_LABEL[row.bonus.tier]
                              ? ` · ${BONUS_TIER_LABEL[row.bonus.tier]}`
                              : ""}
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">0 Cards</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {plantValue ? (
                        <Badge variant="outline" className={cn("gap-1 text-[10px]", PLANT_BADGE_CLASS)}>
                          <Leaf className="h-2.5 w-2.5" />
                          {plantValue}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      <div className="flex items-center justify-center gap-1">
                        {row.bingoWinCount > 0 ? (
                          <>
                            <Trophy className="h-3.5 w-3.5 text-amber-500" />
                            <span className="text-sm font-semibold tabular-nums">{row.bingoWinCount}</span>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-semibold tabular-nums">
                        {new Intl.NumberFormat(undefined, {
                          style: "currency",
                          currency: row.currency,
                        }).format(row.totalSpend)}
                      </p>
                      <div className="mt-1 h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: `${Math.min(100, (row.totalSpend / maxSpend) * 100)}%` }}
                        />
                      </div>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <TableActionButton
                        label="Actions"
                        items={[
                          { label: "View attendee", onSelect: () => openDrawer(row) },
                          {
                            label: "Check in",
                            onSelect: () => {
                              void checkInOne(row.registrationId).then((ok) => {
                                if (ok) void load();
                              });
                            },
                            disabled: row.checkInStatus === "checked_in",
                          },
                          { label: "Sell bonus cards", onSelect: () => openSellBonus(row) },
                          { label: "Record bingo win", onSelect: () => openRecordWinner(row) },
                          { label: "Edit plant request", onSelect: () => openPlantRequest(row) },
                          { label: "Resend ticket", onSelect: () => openResendTicket(row) },
                          { label: "Issue refund", onSelect: () => openIssueRefund(row) },
                          { label: "View customer history", onSelect: () => openDrawer(row) },
                        ]}
                      />
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {!loading && data ? (
        <AttendeeAnalyticsPanels summary={data.summary} analytics={data.analytics} />
      ) : null}

      {data && data.totalPages > 1 ? (
        <div className="flex items-center justify-between gap-2 text-sm">
          <p className="text-muted-foreground">
            Page {data.page} of {data.totalPages} · {data.total} {noun.singular}(s)
          </p>
          <div className="flex gap-1">
            <Button type="button" size="sm" variant="outline" disabled={data.page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={data.page >= data.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex justify-end">
        <Button type="button" variant="outline" size="sm" onClick={exportCsv}>
          <Download className="mr-1.5 h-4 w-4" />
          Export filtered results
        </Button>
      </div>

      <AttendeeDrawer
        eventId={props.eventId}
        registrationId={drawerId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onCheckIn={checkInOne}
        onReload={load}
      />

      <PlantRequestDialog
        open={plantRequestOpen}
        onOpenChange={setPlantRequestOpen}
        eventId={props.eventId}
        registrationId={plantRequestReg?.id}
        registrationLabel={plantRequestReg?.label}
        plants={inventoryPlants}
        onSaved={load}
      />

      <SellBonusCardsDrawer
        open={bonusOpen}
        onOpenChange={setBonusOpen}
        eventId={props.eventId}
        attendee={actionAttendee}
        unitPrice={bonusUnitPrice}
        onSaved={load}
      />

      <ResendTicketDrawer
        open={resendOpen}
        onOpenChange={setResendOpen}
        eventId={props.eventId}
        attendee={actionAttendee}
        onSaved={load}
      />

      <IssueRefundDrawer
        open={refundOpen}
        onOpenChange={setRefundOpen}
        eventId={props.eventId}
        attendee={actionAttendee}
        onSaved={load}
      />

      <RecordWinnerDialog
        open={winnerOpen}
        onOpenChange={setWinnerOpen}
        eventId={props.eventId}
        rounds={rounds}
        defaultRegistrationId={actionAttendee?.registrationId ?? null}
        defaultRegistrationLabel={actionAttendee?.fullName ?? null}
        onSaved={load}
      />
    </div>
  );
}
