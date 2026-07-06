"use client";

import { useState, type ReactNode } from "react";
import { Calendar, Clock, MapPin, Users, Ticket } from "lucide-react";
import { SiteHeader } from "@/components/waterice/site-header";

type EventItem = {
  id: string;
  monthShort: string;
  day: string;
  title: string;
  blurb: string;
  time: string;
  location: string;
  address: string;
  capacity: string;
  price: string;
  description: string;
};

const events: EventItem[] = [
  {
    id: "1",
    monthShort: "APR",
    day: "18",
    title: "Birmingham, Alabama",
    blurb: "An evening of generosity supporting local communities through music, food, and shared purpose.",
    time: "6:00 PM – 10:00 PM",
    location: "Grand Hall Ballroom",
    address: "1200 Market Street, Philadelphia, PA",
    capacity: "250 guests",
    price: "$75 suggested donation",
    description:
      "Join us for a memorable night raising funds for community youth programs. The evening features a live jazz quartet, a curated three-course dinner, and a silent auction featuring works from local artists. Black-tie optional.",
  },
  {
    id: "2",
    monthShort: "MAY",
    day: "02",
    title: "Jacksonville, Florida",
    blurb: "A showcase of emerging talent across painting, sculpture, and mixed media installations.",
    time: "11:00 AM – 8:00 PM",
    location: "Riverside Gallery",
    address: "84 Walnut Avenue, Philadelphia, PA",
    capacity: "Open admission",
    price: "Free entry",
    description:
      "Discover the work of fifteen rising artists exploring themes of renewal, identity, and the urban landscape. Curators will give guided walkthroughs at 2pm and 5pm. Refreshments provided throughout the day.",
  },
  {
    id: "3",
    monthShort: "MAY",
    day: "16",
    title: "Orlando, Florida",
    blurb: "Classic cinema under the stars with gourmet snacks and craft sodas on the lawn.",
    time: "8:30 PM – 11:30 PM",
    location: "Liberty Park Lawn",
    address: "500 Independence Mall, Philadelphia, PA",
    capacity: "400 seats (BYO blanket)",
    price: "$12 per person",
    description:
      "Settle in for a screening of a beloved cinema classic projected on a 40-foot LED screen. Doors open at 7:30 PM with food trucks, popcorn carts, and a small bar serving local craft beverages.",
  },
  {
    id: "4",
    monthShort: "JUN",
    day: "07",
    title: "Atlanta, Georgia",
    blurb: "Monthly gathering of founders, engineers, and operators building the next wave of products.",
    time: "7:00 PM – 10:00 PM",
    location: "The Loft at 22nd",
    address: "2210 Chestnut Street, Philadelphia, PA",
    capacity: "120 attendees",
    price: "Free with RSVP",
    description:
      "Three lightning talks followed by structured networking. This month we're hearing from founders working on developer tools, climate tech, and consumer AI. Drinks and small plates provided.",
  },
  {
    id: "5",
    monthShort: "JUN",
    day: "21",
    title: "Summer Boot Camp",
    blurb: "A community 5K to mark the longest day of the year. All paces welcome.",
    time: "5:30 AM – 8:00 AM",
    location: "Schuylkill River Trail",
    address: "Lloyd Hall, 1 Boathouse Row, Philadelphia, PA",
    capacity: "800 runners",
    price: "$25 registration",
    description:
      "Greet the sunrise with a scenic run along the river. Registration includes a tech tee, finisher medal, and post-race breakfast from local cafés. Walkers and strollers welcome on the back of the pack.",
  },
];

export function EventsClient() {
  const [selectedId, setSelectedId] = useState(events[0].id);
  const selected = events.find((e) => e.id === selectedId)!;

  return (
    <div className="min-h-screen bg-event-page text-event-navy">
      <SiteHeader active="events" />

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 border-b border-border/60">
        <div className="max-w-7xl mx-auto px-6 py-16 text-center">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-primary">
            On Tour 2026
          </p>
          <h1 className="font-display text-4xl md:text-6xl font-extrabold mt-4 leading-tight">
            Catch us on <span className="text-primary">the road.</span>
          </h1>
          <p className="mt-5 text-lg text-muted-foreground max-w-2xl mx-auto">
            City to city, block party to ballroom — Water Ice Express is bringing the
            cups, the syrup, and the game plan everywhere our community calls home.
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-6 py-16 md:py-20">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <ul className="flex flex-col gap-4">
            {events.map((event) => {
              const active = event.id === selectedId;
              return (
                <li key={event.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(event.id)}
                    className={`group relative w-full overflow-hidden rounded-md border text-left transition-all ${
                      active
                        ? "border-event-orange bg-event-surface shadow-[0_10px_30px_-18px_var(--event-orange)]"
                        : "border-event-border bg-event-surface hover:border-event-orange hover:bg-event-surface-soft"
                    }`}
                    aria-pressed={active}
                  >
                    <div
                      className="pointer-events-none absolute inset-0 opacity-[0.06]"
                      style={{ backgroundImage: "repeating-linear-gradient(135deg, #fff 0 1px, transparent 1px 10px)" }}
                    />
                    <div className="relative flex items-stretch gap-5 p-5">
                      <div className="flex w-20 shrink-0 flex-col items-center justify-center border-r border-event-border pr-5">
                        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-event-muted">
                          {event.monthShort}
                        </span>
                        <span className="text-4xl font-bold leading-none text-event-orange">{event.day}</span>
                      </div>
                      <div className="flex flex-1 flex-col justify-center">
                        <h2 className="text-lg font-semibold uppercase tracking-[0.18em] text-event-navy">
                          {event.title}
                        </h2>
                        <p className="mt-2 text-sm leading-relaxed text-event-muted">{event.blurb}</p>
                      </div>
                    </div>
                    <div
                      className={`h-[3px] w-full origin-left transition-transform ${
                        active ? "scale-x-100 bg-event-orange" : "scale-x-0 bg-event-orange group-hover:scale-x-100"
                      }`}
                    />
                  </button>
                </li>
              );
            })}
          </ul>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <article
              key={selected.id}
              className="overflow-hidden rounded-md border border-event-border bg-event-surface shadow-[0_20px_45px_-32px_var(--event-navy)]"
            >
              <div className="border-b border-event-border bg-event-surface-soft p-6">
                <div className="flex items-start gap-5">
                  <div className="flex w-20 shrink-0 flex-col items-center justify-center rounded-md bg-event-orange px-3 py-2 text-event-surface">
                    <span className="text-xs font-bold uppercase tracking-[0.2em]">{selected.monthShort}</span>
                    <span className="text-4xl font-extrabold leading-none">{selected.day}</span>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-event-orange">Featured event</p>
                    <h2 className="mt-1 text-2xl font-bold uppercase tracking-[0.15em]">{selected.title}</h2>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <p className="text-sm leading-relaxed text-event-muted">{selected.description}</p>

                <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                  <DetailRow icon={<Clock className="h-4 w-4" />} label="Time" value={selected.time} />
                  <DetailRow icon={<MapPin className="h-4 w-4" />} label="Venue" value={selected.location} />
                  <DetailRow icon={<Calendar className="h-4 w-4" />} label="Address" value={selected.address} />
                  <DetailRow icon={<Users className="h-4 w-4" />} label="Capacity" value={selected.capacity} />
                  <DetailRow icon={<Ticket className="h-4 w-4" />} label="Admission" value={selected.price} />
                </dl>

                <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-stretch">
                  <button className="group relative flex-1 overflow-hidden rounded-md bg-event-orange px-8 py-5 text-left transition hover:brightness-95">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-event-surface/80">
                          Don&apos;t miss out
                        </p>
                        <p className="mt-1 text-xl font-bold uppercase tracking-[0.18em] text-event-surface">
                          RSVP Now
                        </p>
                        <p className="mt-1 text-xs text-event-surface/85">
                          Secure your spot — limited availability
                        </p>
                      </div>
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-event-surface text-event-orange transition group-hover:translate-x-1">
                        →
                      </span>
                    </div>
                  </button>
                  <button className="rounded-md border border-event-border px-5 py-3 text-sm font-semibold uppercase tracking-wider text-event-navy transition hover:border-event-blue hover:text-event-blue sm:px-6">
                    Add to Calendar
                  </button>
                </div>
              </div>
            </article>
          </aside>
        </div>
      </main>
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-event-border bg-event-surface-soft p-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-event-orange/10 text-event-orange">
        {icon}
      </span>
      <div>
        <dt className="text-[10px] font-semibold uppercase tracking-[0.2em] text-event-muted">{label}</dt>
        <dd className="mt-0.5 text-sm text-event-navy">{value}</dd>
      </div>
    </div>
  );
}
