import Link from "next/link";
import {
  CalendarDays,
  Clock,
  MapPin,
  Ticket,
  Share2,
  QrCode,
  Users,
  Shirt,
  Utensils,
} from "lucide-react";
import {
  events,
  formatEventDate,
  getCompany,
  getVenue,
  type BingoEvent,
} from "@/lib/greenhouse-bingo/mock";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function EventDetailContent({ event }: { event: BingoEvent }) {
  const co = getCompany(event.companySlug)!;
  const v = getVenue(event.venueId)!;
  const remaining = event.capacity - event.ticketsSold;
  const other = events
    .filter((e) => e.id !== event.id && e.companySlug === event.companySlug)
    .slice(0, 3);

  return (
    <>
      <section className="relative border-b border-border/60 bg-gradient-to-br from-primary via-moss to-primary text-primary-foreground">
        <div className="absolute inset-0 opacity-20 mix-blend-overlay [background-image:radial-gradient(circle_at_30%_10%,white,transparent_45%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
          <Link
            href={`/partners/${co.slug}`}
            className="text-xs font-semibold uppercase tracking-widest opacity-80 hover:opacity-100"
          >
            {co.name}
          </Link>
          <h1 className="mt-3 max-w-3xl font-display text-4xl leading-tight md:text-6xl">
            {event.title}
          </h1>
          <div className="mt-6 flex flex-wrap gap-2">
            <Badge className="bg-white/15 text-primary-foreground">{event.ageRule}</Badge>
            <Badge className="bg-white/15 text-primary-foreground">{v.type}</Badge>
            {event.featured && (
              <Badge className="bg-accent text-accent-foreground">Featured</Badge>
            )}
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-3">
              <CalendarDays className="h-5 w-5 opacity-80" />
              <div>
                <div className="text-xs opacity-70">Date</div>
                <div className="font-medium">{formatEventDate(event.date)}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 opacity-80" />
              <div>
                <div className="text-xs opacity-70">Doors / Bingo</div>
                <div className="font-medium">
                  {event.doorsOpen} · {event.bingoStart}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 opacity-80" />
              <div>
                <div className="text-xs opacity-70">Venue</div>
                <div className="font-medium">
                  {v.name} · {v.city}, {v.state}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_360px]">
        <div>
          <h2 className="font-display text-2xl">About this event</h2>
          <p className="mt-3 text-muted-foreground">{event.description}</p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              { icon: Ticket, label: "Included", val: `${event.cardsIncluded} bingo cards` },
              { icon: Ticket, label: "Extra card", val: `$${event.extraCardPrice}` },
              { icon: Utensils, label: "Food & drink", val: event.foodNote },
              { icon: Shirt, label: "Attire", val: event.attire },
              { icon: Users, label: "Capacity", val: `${event.capacity} seats` },
              { icon: Users, label: "Remaining", val: `${remaining} left` },
            ].map((f) => (
              <div key={f.label} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
                  <f.icon className="h-4 w-4" /> {f.label}
                </div>
                <div className="mt-1 font-medium">{f.val}</div>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-border bg-card p-6">
            <h3 className="font-display text-xl">Venue</h3>
            <div className="mt-2 text-sm text-muted-foreground">
              <div className="font-medium text-foreground">{v.name}</div>
              <div>{v.address}</div>
              <div>
                {v.city}, {v.state}
              </div>
            </div>
            <div className="mt-4 aspect-[16/6] rounded-xl bg-gradient-to-br from-secondary to-muted" />
          </div>

          {other.length > 0 && (
            <div className="mt-12">
              <h3 className="font-display text-xl">More from {co.name}</h3>
              <div className="mt-4 space-y-2">
                {other.map((e) => (
                  <Link
                    key={e.id}
                    href={`/events/${e.slug}`}
                    className="flex items-center justify-between rounded-lg border border-border bg-card p-4 hover:bg-secondary"
                  >
                    <div>
                      <div className="font-medium">{e.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatEventDate(e.date)}
                      </div>
                    </div>
                    <div className="text-sm font-semibold">${e.price}</div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-lift">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">
                  Ticket
                </div>
                <div className="font-display text-4xl">${event.price}</div>
              </div>
              <Badge variant="secondary">{remaining} left</Badge>
            </div>
            <Button size="lg" className="mt-6 w-full">
              <Ticket className="mr-2 h-4 w-4" /> Buy ticket
            </Button>
            <Button size="lg" variant="outline" className="mt-2 w-full">
              <Share2 className="mr-2 h-4 w-4" /> Share event
            </Button>

            <div className="mt-6 grid place-items-center rounded-xl bg-secondary/60 p-6">
              <div className="grid h-32 w-32 place-items-center rounded-lg border border-dashed border-border bg-background text-muted-foreground">
                <QrCode className="h-10 w-10" />
              </div>
              <div className="mt-2 text-xs text-muted-foreground">Scan to open on mobile</div>
            </div>
          </div>
        </aside>
      </section>
    </>
  );
}
