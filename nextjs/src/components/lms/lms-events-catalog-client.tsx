"use client";

import * as React from "react";

import { EventFilters } from "@/components/lms/events/event-filters";
import { EventList } from "@/components/lms/events/event-list";
import { EventListSkeleton } from "@/components/lms/events/event-loading-skeleton";
import type { LmsEventListFiltersInput } from "@/lib/lms-events/schemas";
import type { LmsEvent, LmsEventCategory } from "@/lib/lms-events/types";

const DEFAULT_FILTERS: LmsEventListFiltersInput = {};

export function LmsEventsCatalogClient() {
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [categories, setCategories] = React.useState<LmsEventCategory[]>([]);
  const [events, setEvents] = React.useState<LmsEvent[]>([]);
  const [filters, setFilters] = React.useState<LmsEventListFiltersInput>(DEFAULT_FILTERS);

  const load = React.useCallback(async (nextFilters: LmsEventListFiltersInput) => {
    setLoading(true);
    setErr(null);
    const params = new URLSearchParams();
    if (nextFilters.search) params.set("search", nextFilters.search);
    if (nextFilters.categoryId) params.set("categoryId", nextFilters.categoryId);
    if (nextFilters.deliveryMode) params.set("deliveryMode", nextFilters.deliveryMode);
    if (nextFilters.location) params.set("location", nextFilters.location);
    if (nextFilters.dateFrom) params.set("dateFrom", nextFilters.dateFrom);
    if (nextFilters.dateTo) params.set("dateTo", nextFilters.dateTo);
    if (nextFilters.freeOnly) params.set("freeOnly", "true");
    if (nextFilters.paidOnly) params.set("paidOnly", "true");
    if (nextFilters.certificationOnly) params.set("certificationOnly", "true");

    const res = await fetch(`/api/lms/events?${params.toString()}`, {
      credentials: "include",
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as {
      ok?: boolean;
      message?: string;
      categories?: LmsEventCategory[];
      events?: LmsEvent[];
    } | null;

    if (!res.ok || !data?.ok) {
      setErr(data?.message ?? "Could not load events.");
      setLoading(false);
      return;
    }
    setCategories(data.categories ?? []);
    setEvents(data.events ?? []);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    const timer = window.setTimeout(() => void load(filters), filters.search ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [filters, load]);

  return (
    <div className="space-y-6">
      <EventFilters
        categories={categories}
        value={filters}
        onChange={setFilters}
        onReset={() => setFilters(DEFAULT_FILTERS)}
      />

      {err ? <p className="text-sm text-destructive">{err}</p> : null}

      {loading ? (
        <EventListSkeleton />
      ) : (
        <EventList
          events={events}
          emptyTitle="No events match your filters"
          emptyDescription="Try adjusting search or filters, or check back later for new training sessions."
        />
      )}
    </div>
  );
}
