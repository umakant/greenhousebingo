import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { EventDetailCard } from "@/components/events/event-detail-card";
import type { EventItem } from "@/lib/events";

/**
 * Full-page layout for a single published event (`/events/[slug]`).
 */
export function PublicEventDetailView({
  event,
  themeChrome,
}: {
  event: EventItem;
  themeChrome?: boolean;
}) {
  const tc = Boolean(themeChrome);

  return (
    <section className="mx-auto max-w-3xl px-6 py-16 md:py-24 text-foreground">
      <div className="mb-8 flex flex-wrap items-center gap-4">
        <Link
          href="/events"
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground transition hover:text-orange-500"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          All events
        </Link>
        {tc ? null : (
          <>
            <span className="text-muted-foreground/40" aria-hidden>
              ·
            </span>
            <Link
              href="/shop"
              className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground transition hover:text-orange-500"
            >
              Back to shop
            </Link>
          </>
        )}
      </div>

      <EventDetailCard event={event} />
    </section>
  );
}
