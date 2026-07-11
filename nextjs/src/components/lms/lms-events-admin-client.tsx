"use client";

import * as React from "react";
import Link from "next/link";
import {
  Grid3X3,
  LayoutList,
  Loader2,
  Plus,
} from "lucide-react";

import { EventFilters } from "@/components/lms/events/event-filters";
import { EventEmptyState } from "@/components/lms/events/event-empty-state";
import { LmsEventAdminCard } from "@/components/lms/lms-event-admin-card";
import { LmsEventFormSheet, type LmsEventSheetMode } from "@/components/lms/lms-event-form-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { LmsEventListFiltersInput } from "@/lib/lms-events/schemas";
import { isActiveAdminListEvent, isEventPast } from "@/lib/lms-events/event-lifecycle";
import {
  lmsEventAdminAttendeesPath,
  lmsEventAdminCheckInPath,
  lmsEventAdminDetailPath,
  lmsEventAdminTicketsPath,
} from "@/lib/lms-events/paths";
import type { LmsEvent, LmsEventCategory } from "@/lib/lms-events/types";
import { cn } from "@/lib/utils";

const DEFAULT_FILTERS: LmsEventListFiltersInput = {};
const PER_PAGE_OPTIONS = [6, 12, 24] as const;

type TimeTab = "all" | "upcoming" | "today" | "week" | "month" | "archived";
type ViewMode = "grid" | "list";
type SortKey = "upcoming" | "title" | "price";

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function matchesTimeTab(event: LmsEvent, tab: TimeTab): boolean {
  const now = new Date();
  const start = new Date(event.startsAt);
  if (tab === "archived") return event.status === "archived";
  if (tab === "all") return isActiveAdminListEvent(event);
  if (tab === "upcoming") return start.getTime() >= now.getTime() && event.status !== "archived";
  if (tab === "today") {
    return start >= startOfDay(now) && start <= endOfDay(now);
  }
  if (tab === "week") {
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);
    return start >= startOfDay(now) && start <= weekEnd;
  }
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return start >= startOfDay(now) && start <= monthEnd;
}

function sortEvents(events: LmsEvent[], sort: SortKey): LmsEvent[] {
  const copy = [...events];
  if (sort === "title") {
    copy.sort((a, b) => a.title.localeCompare(b.title));
    return copy;
  }
  if (sort === "price") {
    copy.sort((a, b) => (a.priceFrom ?? 0) - (b.priceFrom ?? 0));
    return copy;
  }
  copy.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  return copy;
}

export function LmsEventsAdminClient() {
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [events, setEvents] = React.useState<LmsEvent[]>([]);
  const [categories, setCategories] = React.useState<LmsEventCategory[]>([]);
  const [filters, setFilters] = React.useState<LmsEventListFiltersInput>(DEFAULT_FILTERS);
  const [timeTab, setTimeTab] = React.useState<TimeTab>("all");
  const [sort, setSort] = React.useState<SortKey>("upcoming");
  const [view, setView] = React.useState<ViewMode>("grid");
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState<(typeof PER_PAGE_OPTIONS)[number]>(6);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [sheetMode, setSheetMode] = React.useState<LmsEventSheetMode>("create");
  const [sheetEventId, setSheetEventId] = React.useState<string | undefined>();
  const [sheetEventTitle, setSheetEventTitle] = React.useState<string | undefined>();

  const openCreateSheet = React.useCallback(() => {
    setSheetMode("create");
    setSheetEventId(undefined);
    setSheetEventTitle(undefined);
    setSheetOpen(true);
  }, []);

  const openEditSheet = React.useCallback((event: Pick<LmsEvent, "id" | "title">) => {
    setSheetMode("edit");
    setSheetEventId(event.id);
    setSheetEventTitle(event.title);
    setSheetOpen(true);
  }, []);

  const eventActionItems = React.useCallback(
    (event: LmsEvent) => [
      {
        label: "Overview",
        href: lmsEventAdminDetailPath(event.id),
      },
      {
        label: "Attendees",
        href: lmsEventAdminAttendeesPath(event.id),
      },
      {
        label: "Tickets",
        href: lmsEventAdminTicketsPath(event.id),
      },
      {
        label: "Check-in",
        href: lmsEventAdminCheckInPath(event.id),
      },
    ],
    [],
  );

  const load = React.useCallback(async (nextFilters: LmsEventListFiltersInput, tab: TimeTab) => {
    setLoading(true);
    setErr(null);
    const params = new URLSearchParams();
    if (nextFilters.search) params.set("search", nextFilters.search);
    if (nextFilters.categoryId) params.set("categoryId", nextFilters.categoryId);
    if (nextFilters.eventType) params.set("eventType", nextFilters.eventType);
    if (nextFilters.deliveryMode) params.set("deliveryMode", nextFilters.deliveryMode);
    if (nextFilters.location) params.set("location", nextFilters.location);
    if (nextFilters.dateFrom) params.set("dateFrom", nextFilters.dateFrom);
    if (nextFilters.dateTo) params.set("dateTo", nextFilters.dateTo);
    if (nextFilters.freeOnly) params.set("freeOnly", "true");
    if (nextFilters.paidOnly) params.set("paidOnly", "true");
    if (nextFilters.certificationOnly) params.set("certificationOnly", "true");
    if (tab === "archived") params.set("status", "archived");

    const res = await fetch(`/api/lms/admin/events?${params.toString()}`, {
      credentials: "include",
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as {
      ok?: boolean;
      message?: string;
      events?: LmsEvent[];
      categories?: LmsEventCategory[];
    } | null;

    if (!res.ok || !data?.ok) {
      setErr(data?.message ?? "Could not load events.");
      setLoading(false);
      return;
    }
    setEvents(data.events ?? []);
    setCategories(data.categories ?? []);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    const timer = window.setTimeout(() => void load(filters, timeTab), filters.search ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [filters, timeTab, load]);

  React.useEffect(() => {
    setPage(1);
  }, [filters, timeTab, sort, perPage]);

  const filtered = React.useMemo(() => {
    const tabbed = events.filter((e) => matchesTimeTab(e, timeTab));
    return sortEvents(tabbed, sort);
  }, [events, timeTab, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageSafe = Math.min(page, totalPages);
  const paged = filtered.slice((pageSafe - 1) * perPage, pageSafe * perPage);

  const upcomingSidebar = React.useMemo(() => {
    return sortEvents(
      events.filter((e) => !isEventPast(e) && e.status !== "archived"),
      "upcoming",
    ).slice(0, 4);
  }, [events]);

  const categoryCounts = React.useMemo(() => {
    const map = new Map<string, { name: string; count: number }>();
    for (const c of categories) map.set(c.id, { name: c.name, count: 0 });
    for (const e of events) {
      if (!e.categoryId) continue;
      const row = map.get(e.categoryId);
      if (row) row.count += 1;
    }
    return [...map.values()].filter((c) => c.count > 0).sort((a, b) => b.count - a.count);
  }, [categories, events]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bingo Events</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse and manage upcoming Plant Bingo events at your venues.
          </p>
        </div>
        <Button onClick={openCreateSheet} className="gap-2">
          <Plus className="h-4 w-4" />
          Add event
        </Button>
      </div>

      <EventFilters
        categories={categories}
        value={filters}
        onChange={setFilters}
        onReset={() => setFilters(DEFAULT_FILTERS)}
        showEventType
      />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={timeTab} onValueChange={(v) => setTimeTab(v as TimeTab)}>
          <TabsList>
            <TabsTrigger value="all">All Events</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="week">This Week</TabsTrigger>
            <TabsTrigger value="month">This Month</TabsTrigger>
            <TabsTrigger value="archived">Archived</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Sort by:</span>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="title">Title</SelectItem>
              <SelectItem value="price">Price</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex rounded-md border p-0.5">
            <Button
              type="button"
              size="icon"
              variant={view === "grid" ? "secondary" : "ghost"}
              className="h-8 w-8"
              onClick={() => setView("grid")}
              aria-label="Grid view"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant={view === "list" ? "secondary" : "ghost"}
              className="h-8 w-8"
              onClick={() => setView("list")}
              aria-label="List view"
            >
              <LayoutList className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          {err ? <p className="text-sm text-destructive">{err}</p> : null}

          {loading ? (
            <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading events…
            </div>
          ) : paged.length === 0 ? (
            <EventEmptyState
              title={timeTab === "archived" ? "No archived events" : "No events yet"}
              description={
                timeTab === "archived"
                  ? "Past events are archived automatically after their end time."
                  : "Create your first bingo event or adjust filters to see seeded demo data."
              }
              actionLabel={timeTab === "archived" ? undefined : "Create Event"}
              onAction={timeTab === "archived" ? undefined : openCreateSheet}
            />
          ) : view === "grid" ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
              {paged.map((event) => (
                <LmsEventAdminCard
                  key={event.id}
                  variant="grid"
                  event={event}
                  onEdit={() => openEditSheet(event)}
                  actionItems={eventActionItems(event)}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {paged.map((event) => (
                <LmsEventAdminCard
                  key={event.id}
                  variant="list"
                  event={event}
                  onEdit={() => openEditSheet(event)}
                  actionItems={eventActionItems(event)}
                />
              ))}
            </div>
          )}

          {filtered.length > 0 ? (
            <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
              <Pagination
                page={pageSafe}
                lastPage={totalPages}
                total={filtered.length}
                from={(pageSafe - 1) * perPage + 1}
                to={Math.min(pageSafe * perPage, filtered.length)}
                onPageChange={setPage}
              />
              <Select
                value={String(perPage)}
                onValueChange={(v) => setPerPage(Number(v) as (typeof PER_PAGE_OPTIONS)[number])}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PER_PAGE_OPTIONS.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} per page
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Upcoming Events</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingSidebar.length === 0 ? (
                <p className="text-sm text-muted-foreground">No upcoming events.</p>
              ) : (
                upcomingSidebar.map((event) => {
                  const d = new Date(event.startsAt);
                  return (
                    <Link
                      key={event.id}
                      href={lmsEventAdminDetailPath(event.id)}
                      className="flex gap-3 rounded-lg border p-2 transition hover:bg-muted/50"
                    >
                      <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-md bg-primary/10 text-primary">
                        <span className="text-[10px] font-semibold uppercase">
                          {d.toLocaleDateString(undefined, { month: "short" })}
                        </span>
                        <span className="text-lg font-bold leading-none">{d.getDate()}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-medium">{event.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                        </p>
                      </div>
                    </Link>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Categories</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {categoryCounts.map((c) => (
                <div key={c.name} className="flex items-center justify-between text-sm">
                  <span>{c.name}</span>
                  <Badge variant="secondary">{c.count}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <Link href="/lms/events" className="block rounded-md px-2 py-1.5 hover:bg-muted">
                Browse catalog
              </Link>
              <Link href="/lms/my-events" className="block rounded-md px-2 py-1.5 hover:bg-muted">
                My bookings
              </Link>
              <Link href="/lms/certificates" className="block rounded-md px-2 py-1.5 hover:bg-muted">
                My certificates
              </Link>
              <Link href="/lms/support" className="block rounded-md px-2 py-1.5 hover:bg-muted">
                Support tickets
              </Link>
              <Link href="/lms/dashboard" className={cn("block rounded-md px-2 py-1.5 hover:bg-muted")}>
                LMS dashboard
              </Link>
            </CardContent>
          </Card>
        </aside>
      </div>

      <LmsEventFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        mode={sheetMode}
        eventId={sheetEventId}
        eventTitle={sheetEventTitle}
        categories={categories}
        onSaved={() => void load(filters, timeTab)}
      />
    </div>
  );
}
