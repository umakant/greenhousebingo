"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays } from "lucide-react";

import { EventDetailCard } from "@/components/events/event-detail-card";
import type { EventItem } from "@/lib/events";

/**
 * Public schedule UI for `/events`. Refactored from the original drop to accept its event list as
 * a prop (server-fetched in the parent page) instead of importing a hard-coded array, and to
 * tolerate optional fields — our admin doesn't capture capacity/price, so those rows are skipped
 * cleanly when empty rather than rendering blank shells.
 */
export default function EventsSchedule({
  events,
  themeChrome,
}: {
  events: EventItem[];
  themeChrome?: boolean;
}) {
  const tc = Boolean(themeChrome);
  const [selectedId, setSelectedId] = useState<string | null>(events[0]?.id ?? null);

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    const match = hash.match(/^event[-_](\d+)$/i);
    if (!match) return;
    const id = match[1];
    const event = events.find((e) => e.id === id);
    if (!event) return;
    if (event.slug) {
      window.location.replace(`/events/${encodeURIComponent(event.slug)}`);
      return;
    }
    setSelectedId(id);
    document.getElementById(`event-${id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [events]);

  const selected = useMemo(
    () => events.find((e) => e.id === selectedId) ?? events[0] ?? null,
    [events, selectedId],
  );

  if (events.length === 0 || !selected) {
    return (
      <section className="mx-auto max-w-7xl px-6 py-16 md:py-24 text-foreground">
        {tc ? null : <BackToShop />}
        <header className="mb-12 md:mb-16">
          <p className="mb-3 text-xs uppercase tracking-[0.3em] text-orange-500">Schedule</p>
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Upcoming Events</h1>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground">
            New tour dates, pop-ups, and festivals are being lined up — check back shortly.
          </p>
        </header>
        <div className="flex flex-col items-center justify-center gap-4 rounded-md border border-dashed border-border bg-card p-16 text-center">
          <CalendarDays className="h-10 w-10 text-muted-foreground" aria-hidden />
          <p className="text-lg font-medium">No events scheduled yet</p>
          <p className="max-w-md text-sm text-muted-foreground">
            We&apos;ll publish the next round of tour stops here as soon as they&apos;re booked.
          </p>
          <Link
            href="/shop"
            className="mt-2 inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium uppercase tracking-wider transition hover:border-orange-500 hover:text-orange-500"
          >
            Back to shop
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-6 py-16 md:py-24 text-foreground">
      {tc ? null : <BackToShop />}
      <header className="mb-12 md:mb-16">
        <p className="mb-3 text-xs uppercase tracking-[0.3em] text-orange-500">Schedule</p>
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Upcoming Events</h1>
        <p className="mt-3 max-w-xl text-sm text-muted-foreground">
          Select a date to view the full details, including time, location, and how to attend.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <ul className="flex flex-col gap-4">
          {events.map((event) => {
            const active = event.id === selected.id;
            const href = event.slug ? `/events/${encodeURIComponent(event.slug)}` : undefined;
            return (
              <li key={event.id} id={`event-${event.id}`}>
                <button
                  type="button"
                  onClick={() => setSelectedId(event.id)}
                  aria-pressed={active}
                  className={`group relative w-full overflow-hidden rounded-md border text-left transition-all ${
                    active
                      ? "border-orange-500 bg-card shadow-[0_10px_30px_-18px_rgba(249,115,22,0.6)]"
                      : "border-border bg-card hover:border-orange-500 hover:bg-accent"
                  }`}
                >
                  <div className="relative flex items-stretch gap-5 p-5">
                    <div className="flex w-20 shrink-0 flex-col items-center justify-center border-r border-border pr-5">
                      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        {event.monthShort}
                      </span>
                      <span className="text-4xl font-bold leading-none text-orange-500">{event.day}</span>
                    </div>
                    <div className="flex flex-1 flex-col justify-center">
                      <h2 className="text-lg font-semibold uppercase tracking-[0.18em]">
                        {href ? (
                          <Link
                            href={href}
                            className="hover:text-orange-500"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {event.title}
                          </Link>
                        ) : (
                          event.title
                        )}
                      </h2>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {event.blurb}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`h-[3px] w-full origin-left bg-orange-500 transition-transform ${
                      active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                    }`}
                  />
                </button>
              </li>
            );
          })}
        </ul>

        <aside className="lg:sticky lg:top-8 lg:self-start">
          <EventDetailCard key={selected.id} event={selected} showViewPageLink />
        </aside>
      </div>
    </section>
  );
}

function BackToShop() {
  return (
    <div className="mb-8">
      <Link
        href="/shop"
        className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground transition hover:text-orange-500"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Back to shop
      </Link>
    </div>
  );
}

export type { EventItem };
