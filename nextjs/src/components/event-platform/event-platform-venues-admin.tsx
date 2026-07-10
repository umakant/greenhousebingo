"use client";

import * as React from "react";
import Link from "next/link";
import {
  Building2,
  Calendar,
  CalendarCheck,
  ChevronRight,
  Coffee,
  Filter,
  Loader2,
  MapPin,
  Plus,
  Search,
  Users,
} from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { toast } from "sonner";

import NoRecordsFound from "@/components/no-records-found";
import {
  emptyVenueForm,
  VenueFormSheet,
  type VenueFormState,
  venueFormFromDto,
} from "@/components/event-platform/venue-form-sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
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
import { useAppSettingsOptional } from "@/contexts/app-settings-context";
import { formatPhoneDisplay, normalizeMobileForStorage } from "@/lib/phone";
import { normalizeWebsiteUrl } from "@/lib/website-url";
import { EVENT_PLATFORM_PATHS } from "@/lib/event-platform/paths";
import {
  computeAmenityRows,
  computeCapacitySlices,
  computeUpcomingByVenue,
  computeVenueDashboardSummary,
  venueCapacityTier,
  venueInUseIds,
} from "@/lib/event-platform/venues/venue-dashboard-stats";
import type { EventVenueDto, VenueBusinessHours } from "@/lib/event-platform/venues/venue-types";
import { VENUE_WEEKDAYS } from "@/lib/event-platform/venues/venue-types";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

type LmsEventRow = { venueName?: string | null; startsAt?: string | null };

function contactName(v: EventVenueDto) {
  const parts = [v.contactFirstName, v.contactLastName].filter(Boolean);
  return parts.length ? parts.join(" ") : "—";
}

function locationLabel(v: EventVenueDto) {
  const parts = [v.city, v.state].filter(Boolean);
  return parts.length ? parts.join(", ") : "—";
}

function boolLabel(value: boolean) {
  return value ? "Yes" : "No";
}

function venueInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function statusClass(status: string) {
  const s = status.toLowerCase();
  if (s === "active") return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
  if (s === "inactive") return "bg-muted text-muted-foreground";
  return "bg-amber-500/15 text-amber-700 dark:text-amber-400";
}

function buildPayload(form: VenueFormState) {
  const businessHours: VenueBusinessHours = {};
  for (const day of VENUE_WEEKDAYS) {
    const val = form.businessHours[day].trim();
    if (val) businessHours[day] = val;
  }
  return {
    name: form.name.trim(),
    imageUrl: form.imageUrl.trim() || null,
    phone: normalizeMobileForStorage(form.phone),
    website: normalizeWebsiteUrl(form.website) || null,
    address: form.address.trim() || null,
    address2: form.address2.trim() || null,
    city: form.city.trim() || null,
    state: form.state.trim() || null,
    zip: form.zip.trim() || null,
    latitude: form.latitude.trim() || null,
    longitude: form.longitude.trim() || null,
    category: form.category.trim() || null,
    venueType: form.venueType.trim() || null,
    contactFirstName: form.contactFirstName.trim() || null,
    contactLastName: form.contactLastName.trim() || null,
    contactPhone: normalizeMobileForStorage(form.contactPhone),
    contactEmail: form.contactEmail.trim() || null,
    seating: form.seating.trim() || null,
    age21Plus: form.age21Plus,
    drinksAlcohol: form.drinksAlcohol,
    food: form.food,
    businessHours: Object.keys(businessHours).length ? businessHours : null,
  };
}

function StatCard(props: {
  label: string;
  value: string;
  sub?: string;
  subClass?: string;
  icon: React.ReactNode;
  iconBg: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-medium text-muted-foreground">{props.label}</p>
          <p className="text-2xl font-bold tracking-tight">{props.value}</p>
          {props.sub ? (
            <p className={cn("text-xs", props.subClass ?? "text-muted-foreground")}>{props.sub}</p>
          ) : null}
        </div>
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", props.iconBg)}>
          {props.icon}
        </div>
      </div>
    </div>
  );
}

export function EventPlatformVenuesAdmin() {
  const appSettings = useAppSettingsOptional();
  const googleMapsApiKey = appSettings?.settings?.googleMapsApiKey;
  const [items, setItems] = React.useState<EventVenueDto[] | null>(null);
  const [events, setEvents] = React.useState<LmsEventRow[]>([]);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [locationFilter, setLocationFilter] = React.useState("all");
  const [capacityFilter, setCapacityFilter] = React.useState("all");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(PAGE_SIZE);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState<VenueFormState>(emptyVenueForm);

  const reload = React.useCallback(async () => {
    const [venueRes, eventRes] = await Promise.all([
      fetch("/api/event-platform/venues", { credentials: "include", cache: "no-store" }),
      fetch("/api/lms/admin/events", { credentials: "include", cache: "no-store" }),
    ]);
    const data = (await venueRes.json().catch(() => null)) as {
      ok?: boolean;
      items?: EventVenueDto[];
      message?: string;
    } | null;
    if (!venueRes.ok || !data?.ok) {
      toast.error(data?.message ?? "Could not load venues.");
      setItems([]);
    } else {
      setItems(data.items ?? []);
    }

    const eventData = (await eventRes.json().catch(() => null)) as {
      ok?: boolean;
      events?: LmsEventRow[];
    } | null;
    if (eventRes.ok && eventData?.ok && Array.isArray(eventData.events)) {
      setEvents(eventData.events);
    } else {
      setEvents([]);
    }
  }, []);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  const inUseIds = React.useMemo(
    () => (items ? venueInUseIds(items, events) : new Set<string>()),
    [items, events],
  );

  const summary = React.useMemo(
    () => (items ? computeVenueDashboardSummary(items, inUseIds) : null),
    [items, inUseIds],
  );

  const capacitySlices = React.useMemo(() => (items ? computeCapacitySlices(items) : []), [items]);
  const amenityRows = React.useMemo(() => (items ? computeAmenityRows(items) : []), [items]);
  const upcomingByVenue = React.useMemo(
    () => (items ? computeUpcomingByVenue(items, events) : []),
    [items, events],
  );

  const pieData = capacitySlices.filter((s) => s.count > 0).map((s) => ({ name: s.label, value: s.count, color: s.color }));

  const cities = React.useMemo(() => {
    if (!items) return [];
    return [...new Set(items.map((v) => v.city?.trim()).filter(Boolean))].sort() as string[];
  }, [items]);

  React.useEffect(() => {
    setPage(1);
  }, [search, statusFilter, locationFilter, capacityFilter, pageSize]);

  const filtered = React.useMemo(() => {
    if (!items) return [];
    const q = search.trim().toLowerCase();
    return items.filter((v) => {
      if (statusFilter !== "all" && v.status !== statusFilter) return false;
      if (locationFilter !== "all" && (v.city ?? "").trim() !== locationFilter) return false;
      if (capacityFilter !== "all" && venueCapacityTier(v.seating) !== capacityFilter) return false;
      if (!q) return true;
      return (
        v.name.toLowerCase().includes(q) ||
        (v.city ?? "").toLowerCase().includes(q) ||
        (v.state ?? "").toLowerCase().includes(q) ||
        (v.contactEmail ?? "").toLowerCase().includes(q) ||
        (v.phone ?? "").toLowerCase().includes(q) ||
        (v.contactPhone ?? "").toLowerCase().includes(q) ||
        contactName(v).toLowerCase().includes(q)
      );
    });
  }, [items, search, statusFilter, locationFilter, capacityFilter]);

  const lastPage = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);
  const from = filtered.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, filtered.length);

  function resetFilters() {
    setSearch("");
    setStatusFilter("all");
    setLocationFilter("all");
    setCapacityFilter("all");
    setPage(1);
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyVenueForm());
    setSheetOpen(true);
  }

  function openEdit(v: EventVenueDto) {
    setEditingId(v.id);
    setForm(venueFormFromDto(v));
    setSheetOpen(true);
  }

  async function archiveVenue(id: string) {
    const res = await fetch(`/api/event-platform/venues/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
    if (!res.ok || !data?.ok) {
      toast.error(data?.message ?? "Archive failed.");
      return;
    }
    toast.success("Venue archived.");
    await reload();
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Venue name is required.");
      return;
    }
    setSaving(true);
    try {
      const payload = buildPayload(form);
      const url = editingId ? `/api/event-platform/venues/${editingId}` : "/api/event-platform/venues";
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!res.ok || !data?.ok) throw new Error(data?.message ?? "Save failed.");
      toast.success(editingId ? "Venue updated." : "Venue created.");
      setSheetOpen(false);
      setEditingId(null);
      setForm(emptyVenueForm());
      await reload();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  if (items === null) {
    return (
      <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading venues…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Venue Dashboard</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Manage event venues, locations, contacts, and amenities for your organization.
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Venue
        </Button>
      </div>

      {summary ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            label="Total Venues"
            value={String(summary.totalVenues)}
            sub="All locations"
            subClass="text-emerald-600 dark:text-emerald-400"
            icon={<Building2 className="h-5 w-5 text-violet-600" />}
            iconBg="bg-violet-500/10"
          />
          <StatCard
            label="Active Venues"
            value={String(summary.activeVenues)}
            sub="Currently available"
            subClass="text-emerald-600 dark:text-emerald-400"
            icon={<CalendarCheck className="h-5 w-5 text-emerald-600" />}
            iconBg="bg-emerald-500/10"
          />
          <StatCard
            label="Venues in Use"
            value={String(summary.venuesInUse)}
            sub="Have upcoming events"
            subClass="text-amber-600 dark:text-amber-400"
            icon={<Calendar className="h-5 w-5 text-amber-600" />}
            iconBg="bg-amber-500/10"
          />
          <StatCard
            label="Total Capacity"
            value={summary.totalCapacity.toLocaleString()}
            sub="Across all venues"
            subClass="text-blue-600 dark:text-blue-400"
            icon={<Users className="h-5 w-5 text-blue-600" />}
            iconBg="bg-blue-500/10"
          />
          <StatCard
            label="Avg. Capacity"
            value={String(summary.avgCapacity)}
            sub="Per venue"
            subClass="text-emerald-600 dark:text-emerald-400"
            icon={<Coffee className="h-5 w-5 text-rose-600" />}
            iconBg="bg-rose-500/10"
          />
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Venue Capacity Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No seating data yet.</p>
            ) : (
              <>
                <div className="relative mx-auto h-[200px] w-full max-w-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={58}
                        outerRadius={82}
                        paddingAngle={2}
                      >
                        {pieData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold">{summary?.totalCapacity.toLocaleString() ?? "0"}</span>
                    <span className="text-xs text-muted-foreground">Total Capacity</span>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  {capacitySlices.map((s) => (
                    <div key={s.key} className="flex items-center justify-between text-sm">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                        <span className="truncate">
                          {s.label} ({s.range})
                        </span>
                      </span>
                      <span className="shrink-0 text-muted-foreground">
                        {s.count} venue{s.count === 1 ? "" : "s"} ({s.percent}%)
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Amenities Availability</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {amenityRows.map((row) => (
              <div key={row.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span>{row.label}</span>
                  <span className="text-muted-foreground">
                    {row.count}/{row.total} ({row.percent}%)
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${row.percent}%` }}
                  />
                </div>
              </div>
            ))}
            <Button type="button" variant="link" className="h-auto p-0 text-sm" onClick={resetFilters}>
              View all venues
              <ChevronRight className="ml-0.5 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Upcoming Events by Venue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingByVenue.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No upcoming events matched to venues.</p>
            ) : (
              upcomingByVenue.map((row) => (
                <div key={row.venueId} className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate">{row.venueName}</span>
                  <span className="flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 px-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    {row.count}
                  </span>
                </div>
              ))
            )}
            <Button type="button" variant="link" className="h-auto p-0 text-sm" asChild>
              <Link href={EVENT_PLATFORM_PATHS.events}>
                View all events
                <ChevronRight className="ml-0.5 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by venue name, city, contact, or phone…"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full lg:w-[140px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger className="w-full lg:w-[160px]">
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {cities.map((city) => (
                <SelectItem key={city} value={city}>
                  {city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={capacityFilter} onValueChange={setCapacityFilter}>
            <SelectTrigger className="w-full lg:w-[160px]">
              <SelectValue placeholder="All Capacity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Capacity</SelectItem>
              <SelectItem value="small">Small (1–100)</SelectItem>
              <SelectItem value="medium">Medium (101–300)</SelectItem>
              <SelectItem value="large">Large (301–600)</SelectItem>
              <SelectItem value="xlarge">Extra Large (601+)</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="shrink-0">
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
          <button
            type="button"
            className="shrink-0 text-sm text-primary hover:underline"
            onClick={resetFilters}
          >
            Reset
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <NoRecordsFound
          icon={MapPin}
          title="No venues found"
          description="Add your first event venue to get started."
          hasFilters={!!search || statusFilter !== "all" || locationFilter !== "all" || capacityFilter !== "all"}
          onClearFilters={resetFilters}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Venue</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Age 21+</TableHead>
                  <TableHead>Drinks</TableHead>
                  <TableHead>Food</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">
                          {venueInitials(v.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium">{v.name}</p>
                          {v.phone ? (
                            <p className="text-xs text-muted-foreground">{formatPhoneDisplay(v.phone)}</p>
                          ) : null}
                      {v.contactEmail ? (
                            <p className="truncate text-xs text-muted-foreground">{v.contactEmail}</p>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{locationLabel(v)}</p>
                      {v.address ? (
                        <p className="text-xs text-muted-foreground">
                          {[v.address, v.address2].filter(Boolean).join(", ")}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{contactName(v)}</p>
                      {v.contactPhone ? (
                        <p className="text-xs text-muted-foreground">{formatPhoneDisplay(v.contactPhone)}</p>
                      ) : null}
                    </TableCell>
                    <TableCell className="tabular-nums font-medium">{v.seating ?? "—"}</TableCell>
                    <TableCell>{boolLabel(v.age21Plus)}</TableCell>
                    <TableCell>{boolLabel(v.drinksAlcohol)}</TableCell>
                    <TableCell>{boolLabel(v.food)}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                          statusClass(v.status),
                        )}
                      >
                        {v.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <TableActionButton
                        label="Actions"
                        items={[
                          { label: "Edit", onSelect: () => openEdit(v) },
                          {
                            label: "Archive",
                            onSelect: () => void archiveVenue(v.id),
                            destructive: true,
                          },
                        ]}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 border-t px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {from} to {to} of {filtered.length} venues
            </p>
            <Pagination
              page={page}
              lastPage={lastPage}
              total={filtered.length}
              from={from}
              to={to}
              entityLabel="venues"
              showSummary={false}
              onPageChange={setPage}
            />
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground whitespace-nowrap">Rows per page</span>
              <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[5, 10, 25, 50].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      <VenueFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        editingId={editingId}
        form={form}
        setForm={setForm}
        saving={saving}
        googleMapsApiKey={googleMapsApiKey}
        onSubmit={(e) => void submitForm(e)}
      />
    </div>
  );
}
