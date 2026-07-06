import Link from "next/link";
import { CalendarDays, MapPin, Ticket } from "lucide-react";
import { formatEventDate, getCompany, getVenue, type BingoEvent } from "@/lib/greenhouse-bingo/mock";
import { Badge } from "@/components/ui/badge";

export function EventCard({ event }: { event: BingoEvent }) {
  const company = getCompany(event.companySlug);
  const venue = getVenue(event.venueId);

  return (
    <Link
      href={`/events/${event.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift"
    >
      <div className="relative aspect-[16/9] bg-gradient-to-br from-primary/90 via-leaf to-moss">
        <div className="absolute inset-0 opacity-30 mix-blend-overlay [background-image:radial-gradient(circle_at_20%_20%,white,transparent_40%)]" />
        <div className="absolute left-4 top-4 flex gap-2">
          {event.featured && <Badge className="bg-accent text-accent-foreground">Featured</Badge>}
          <Badge variant="secondary">{event.ageRule}</Badge>
        </div>
        <div className="absolute bottom-4 left-4 text-primary-foreground">
          <div className="text-xs uppercase tracking-widest opacity-80">{company?.name}</div>
          <div className="font-display text-2xl leading-tight">{event.title}</div>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="h-4 w-4" />
          {formatEventDate(event.date)} · Doors {event.doorsOpen}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          {venue?.name} · {venue?.city}, {venue?.state}
        </div>
        <div className="mt-auto flex items-center justify-between border-t border-border pt-4">
          <div className="text-sm">
            <span className="font-display text-xl font-semibold">${event.price}</span>
            <span className="text-muted-foreground"> / ticket</span>
          </div>
          <span className="inline-flex items-center gap-1 text-sm font-medium text-primary group-hover:underline">
            <Ticket className="h-4 w-4" /> Get tickets
          </span>
        </div>
      </div>
    </Link>
  );
}
