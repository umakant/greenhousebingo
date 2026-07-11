"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Download, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

import { AttendeeDrawer, bonusTierBadge } from "@/components/event-platform/event-command-center/attendees/attendee-drawer";
import { AttendeeSummaryCards } from "@/components/event-platform/event-command-center/attendees/attendee-summary-cards";
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
import type { EventPlantDto } from "@/lib/event-platform/event-plants/event-plant-types";
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

function buildQueryString(eventId: string, filters: FiltersState, page: number): string {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", String(filters.pageSize));
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

export function EventAttendeesTab(props: { eventId: string }) {
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

  React.useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQ(filters.q.trim()), 300);
    return () => window.clearTimeout(id);
  }, [filters.q]);

  const load = React.useCallback(async () => {
    setLoading(true);
    const qs = buildQueryString(props.eventId, { ...filters, q: debouncedQ }, page);
    const res = await fetch(`/api/event-platform/events/${encodeURIComponent(props.eventId)}/attendees?${qs}`, {
      credentials: "include",
      cache: "no-store",
    });
    const json = (await res.json().catch(() => null)) as EventAttendeesListResult & { ok?: boolean; message?: string };
    if (!res.ok || !json.ok) {
      toast.error(json.message ?? "Could not load attendees.");
      setData(null);
    } else {
      setData(json);
      setSelected(new Set());
    }
    setLoading(false);
  }, [props.eventId, filters, debouncedQ, page]);

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
    toast.success(`Checked in ${ok} attendee(s).`);
    void load();
  }

  function exportCsv() {
    const qs = buildQueryString(props.eventId, { ...filters, q: debouncedQ }, 1);
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

  function patchFilters(patch: Partial<FiltersState>) {
    setFilters((f) => ({ ...f, ...patch }));
  }

  return (
    <div className="space-y-4">
      <AttendeeSummaryCards summary={data?.summary ?? null} loading={loading && !data} />

      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
        <div className="relative min-w-[200px] flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={filters.q}
            onChange={(e) => patchFilters({ q: e.target.value })}
            placeholder="Search name, email, or phone…"
            className="pl-9"
          />
        </div>
        <Select value={filters.registrationStatus} onValueChange={(v) => patchFilters({ registrationStatus: v })}>
          <SelectTrigger className="w-full sm:w-[160px]">
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
        <Select value={filters.checkInStatus} onValueChange={(v) => patchFilters({ checkInStatus: v })}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Check-in" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All check-in</SelectItem>
            <SelectItem value="checked_in">Checked in</SelectItem>
            <SelectItem value="not_checked_in">Not checked in</SelectItem>
            <SelectItem value="no_show">No-show</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.newOrReturning} onValueChange={(v) => patchFilters({ newOrReturning: v })}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="New / returning" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All guests</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="returning">Returning</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.customerType} onValueChange={(v) => patchFilters({ customerType: v })}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Customer type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="returning">Returning</SelectItem>
            <SelectItem value="affiliate_referral">Affiliate</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.ticketTierId} onValueChange={(v) => patchFilters({ ticketTierId: v })}>
          <SelectTrigger className="w-full sm:w-[140px]">
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
        <Select value={filters.bonusCardBuyer} onValueChange={(v) => patchFilters({ bonusCardBuyer: v })}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Bonus cards" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="true">Bonus buyers</SelectItem>
            <SelectItem value="false">No bonus cards</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.sort} onValueChange={(v) => patchFilters({ sort: v as EventAttendeeSortField })}>
          <SelectTrigger className="w-full sm:w-[180px]">
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
        <Select value={filters.pageSize.toString()} onValueChange={(v) => patchFilters({ pageSize: Number(v) as 25 | 50 | 100 })}>
          <SelectTrigger className="w-full sm:w-[100px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="25">25</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
          </SelectContent>
        </Select>
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
            Loading attendees…
          </div>
        ) : rows.length === 0 ? (
          <p className="p-8 text-sm text-muted-foreground">No attendees match your filters.</p>
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
                  <TableHead>Attendee</TableHead>
                  <TableHead className="hidden xl:table-cell">First</TableHead>
                  <TableHead className="hidden xl:table-cell">Last</TableHead>
                  <TableHead className="hidden lg:table-cell">Phone</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead>Reg. status</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead className="hidden lg:table-cell">Tickets</TableHead>
                  <TableHead className="hidden xl:table-cell">Incl.</TableHead>
                  <TableHead>Bonus</TableHead>
                  <TableHead className="hidden lg:table-cell">Total cards</TableHead>
                  <TableHead className="hidden xl:table-cell">Wins</TableHead>
                  <TableHead>Spend</TableHead>
                  <TableHead className="hidden xl:table-cell">Plant</TableHead>
                  <TableHead className="hidden lg:table-cell">Source</TableHead>
                  <TableHead className="hidden lg:table-cell">Type</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow
                    key={row.registrationId}
                    className="cursor-pointer"
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
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          {row.avatarUrl ? <AvatarImage src={row.avatarUrl} alt="" /> : null}
                          <AvatarFallback className="text-xs">{row.initials}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{row.fullName}</p>
                          <p className="truncate text-xs text-muted-foreground md:hidden">{row.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">{row.firstName}</TableCell>
                    <TableCell className="hidden xl:table-cell">{row.lastName || "—"}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {formatPhoneDisplay(row.phone ?? "", "—")}
                    </TableCell>
                    <TableCell className="hidden md:table-cell max-w-[160px] truncate">{row.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize text-[10px]">
                        {row.bookingStatus.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "capitalize text-[10px]",
                          row.checkInStatus === "checked_in" && "border-emerald-500/50 text-emerald-700 dark:text-emerald-400",
                        )}
                      >
                        {row.checkInStatus.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">{row.ticketName}</TableCell>
                    <TableCell className="hidden xl:table-cell tabular-nums">{row.includedCards}</TableCell>
                    <TableCell className="tabular-nums">
                      {row.bonusCards}
                      {bonusTierBadge(row.bonus.tier, row.bonus.showBadge)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell tabular-nums">{row.totalCards}</TableCell>
                    <TableCell className="hidden xl:table-cell tabular-nums">
                      {row.bingoWins === "not_configured" ? "—" : row.bingoWinCount}
                    </TableCell>
                    <TableCell className="tabular-nums whitespace-nowrap">
                      {new Intl.NumberFormat(undefined, { style: "currency", currency: row.currency }).format(
                        row.totalSpend,
                      )}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell text-xs text-muted-foreground">
                      {row.plantRequest.availability === "not_configured"
                        ? "—"
                        : row.plantRequest.availability === "no_records"
                          ? "—"
                          : (row.plantRequest.value ?? "—")}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs">{row.registrationSource}</TableCell>
                    <TableCell className="hidden lg:table-cell text-xs">
                      {CUSTOMER_LABELS[row.customerType] ?? row.customerType}
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
                          { label: "Sell bonus cards", onSelect: () => toast.info("Coming soon.") },
                          { label: "Record bingo win", onSelect: () => toast.info("Coming soon.") },
                          { label: "Edit plant request", onSelect: () => openPlantRequest(row) },
                          { label: "Resend ticket", onSelect: () => toast.info("Coming soon.") },
                          { label: "Issue refund", onSelect: () => toast.info("Coming soon.") },
                          { label: "View customer history", onSelect: () => openDrawer(row) },
                        ]}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {data && data.totalPages > 1 ? (
        <div className="flex items-center justify-between gap-2 text-sm">
          <p className="text-muted-foreground">
            Page {data.page} of {data.totalPages} · {data.total} attendee(s)
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
    </div>
  );
}
