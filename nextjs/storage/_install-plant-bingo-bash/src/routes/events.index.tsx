import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { events, type EventDetail } from "@/lib/events-data";
import { MapPin, Calendar, Clock, Ticket, ChevronRight } from "lucide-react";
import { ReactNode } from "react";

export function StubPage({ title, kicker, children }: { title: string; kicker: string; children?: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <section className="relative overflow-hidden py-24 lg:py-32 bg-gradient-to-b from-secondary/40 to-background">
        <div className="mx-auto max-w-5xl px-6 lg:px-8 text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-forest">{kicker}</p>
          <h1 className="mt-3 font-display text-5xl font-bold text-forest-deep sm:text-7xl">{title}</h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            {children ?? "This page is growing — check back soon."}
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <Link to="/events" className="rounded-full bg-forest px-6 py-3 font-bold text-cream hover:bg-forest-deep transition">
              Browse Events
            </Link>
            <Link to="/" className="rounded-full border border-border bg-white px-6 py-3 font-bold text-forest-deep hover:bg-secondary transition">
              Back Home
            </Link>
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}

const STATE_TO_CODE: Record<string, string> = {
  Florida: "FL", "North Carolina": "NC", Oregon: "OR", Texas: "TX",
  Colorado: "CO", Tennessee: "TN", California: "CA", "New York": "NY",
  Illinois: "IL", Georgia: "GA", Washington: "WA", Arizona: "AZ",
};

// Approximate coords per city we host events in — used to compute distance
// from the user-entered address until the Google Address API wiring lands.
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  "Dallas / Fort Worth,Texas": { lat: 32.7767, lng: -96.7970 },
  "Austin,Texas": { lat: 30.2672, lng: -97.7431 },
  "Jacksonville,Florida": { lat: 30.3322, lng: -81.6557 },
  "Asheville,North Carolina": { lat: 35.5951, lng: -82.5515 },
  "Portland,Oregon": { lat: 45.5152, lng: -122.6784 },
  "Denver,Colorado": { lat: 39.7392, lng: -104.9903 },
  "Nashville,Tennessee": { lat: 36.1627, lng: -86.7816 },
  "Los Angeles,California": { lat: 34.0522, lng: -118.2437 },
  "New York,New York": { lat: 40.7128, lng: -74.0060 },
  "Chicago,Illinois": { lat: 41.8781, lng: -87.6298 },
  "Atlanta,Georgia": { lat: 33.7490, lng: -84.3880 },
  "Seattle,Washington": { lat: 47.6062, lng: -122.3321 },
  "Phoenix,Arizona": { lat: 33.4484, lng: -112.0740 },
};

function coordsForEvent(e: EventDetail) {
  return CITY_COORDS[`${e.city},${e.state}`] ?? null;
}

function haversineMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function groupByState(list: EventDetail[]) {
  const groups: Record<string, { state: string; code: string; events: EventDetail[] }> = {};
  for (const e of list) {
    const code = STATE_TO_CODE[e.state] ?? e.state.slice(0, 2).toUpperCase();
    if (!groups[code]) groups[code] = { state: e.state, code, events: [] };
    groups[code].events.push(e);
  }
  return Object.values(groups).sort((a, b) => a.state.localeCompare(b.state));
}

function getCitiesForState(state: string, list: EventDetail[]) {
  const cities = new Set<string>();
  for (const e of list) if (e.state === state) cities.add(e.city);
  return Array.from(cities).sort();
}

function EventsIndex() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;
    const el = document.getElementById(hash);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const [cityFilter, setCityFilter] = useState<Record<string, string | null>>({});
  const [address, setAddress] = useState("123 Main St, Houston, TX");
  const [lat, setLat] = useState<string>("29.7604");
  const [lng, setLng] = useState<string>("-95.3698");

  const userCoords = (() => {
    const la = parseFloat(lat);
    const ln = parseFloat(lng);
    if (Number.isFinite(la) && Number.isFinite(ln)) return { lat: la, lng: ln };
    return null;
  })();

  const groups = groupByState(events);

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <section className="py-16 lg:py-24 bg-gradient-to-b from-secondary/40 to-background">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-sm font-bold uppercase tracking-widest text-forest">Upcoming Events</p>
            <h1 className="mt-3 font-display text-5xl font-bold text-forest-deep sm:text-6xl">
              Find a venue near you.
            </h1>
            <p className="mt-5 text-lg text-muted-foreground">
              {events.length} events across {groups.length} states — and growing.
            </p>
          </div>

          <div className="sticky top-[5.5rem] z-40 -mx-6 px-6 py-4 lg:-mx-8 lg:px-8 bg-background/80 backdrop-blur-md border-b border-border">
            <div className="flex flex-wrap justify-center gap-2">
              {groups.map((g) => (
                <a
                  key={g.code}
                  href={`#${g.code}`}
                  className="rounded-full border border-border bg-white px-4 py-2 text-sm font-bold text-forest-deep hover:bg-forest hover:text-cream transition"
                >
                  {g.state} ({g.events.length})
                </a>
              ))}
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto] max-w-3xl mx-auto">
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter your address (Google Places coming soon)"
                aria-label="Your address"
                className="rounded-full border border-border bg-white px-4 py-2 text-sm text-forest-deep placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-forest"
              />
              <input
                type="number"
                step="any"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="Latitude"
                aria-label="Latitude"
                className="rounded-full border border-border bg-white px-4 py-2 text-sm text-forest-deep placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-forest w-full sm:w-32"
              />
              <input
                type="number"
                step="any"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="Longitude"
                aria-label="Longitude"
                className="rounded-full border border-border bg-white px-4 py-2 text-sm text-forest-deep placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-forest w-full sm:w-32"
              />
            </div>
          </div>


          <div className="mt-16 space-y-16">
            {groups.map((g) => {
              const cities = getCitiesForState(g.state, events);
              const selectedCity = cityFilter[g.code] ?? null;
              const filtered = selectedCity
                ? g.events.filter((e) => e.city === selectedCity)
                : g.events;

              return (
                <div key={g.code} id={g.code} className="scroll-mt-56">
                  <div className="flex items-baseline justify-between border-b-2 border-forest/20 pb-4">
                    <h2 className="font-display text-3xl font-bold text-forest-deep sm:text-4xl">
                      {g.state}
                    </h2>
                    <span className="text-sm font-bold uppercase tracking-widest text-forest">
                      {g.events.length} venue{g.events.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  {cities.length > 1 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={() => setCityFilter((prev) => ({ ...prev, [g.code]: null }))}
                        className={`rounded-full border px-4 py-1.5 text-sm font-bold transition ${
                          selectedCity === null
                            ? "border-forest bg-forest text-cream"
                            : "border-border bg-white text-forest-deep hover:bg-secondary"
                        }`}
                      >
                        All
                      </button>
                      {cities.map((city) => (
                        <button
                          key={city}
                          onClick={() => setCityFilter((prev) => ({ ...prev, [g.code]: city }))}
                          className={`rounded-full border px-4 py-1.5 text-sm font-bold transition ${
                            selectedCity === city
                              ? "border-forest bg-forest text-cream"
                              : "border-border bg-white text-forest-deep hover:bg-secondary"
                          }`}
                        >
                          {city}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {filtered.map((e) => {
                      const ec = coordsForEvent(e);
                      const miles = userCoords && ec ? haversineMiles(userCoords, ec) : null;
                      return (
                      <Link
                        key={e.slug}
                        to="/events/$slug"
                        params={{ slug: e.slug }}
                        className="group rounded-3xl bg-white border border-border shadow-sm hover:shadow-lifted transition p-6 flex flex-col"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className={`inline-flex items-center gap-2 self-start rounded-full ${e.tint} px-3 py-1 text-xs font-bold uppercase tracking-widest text-forest-deep`}>
                            <Calendar className="h-3 w-3" /> {e.month} {e.day}
                          </div>
                          {miles !== null && (
                            <span className="text-xs font-bold uppercase tracking-widest text-forest">
                              {miles.toFixed(1)} mi
                            </span>
                          )}
                        </div>
                        <h3 className="mt-4 font-display text-2xl font-bold text-forest-deep group-hover:text-forest transition">
                          {e.venue}
                        </h3>
                        <div className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" /> {e.city}, {e.state}
                        </div>
                    <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2"><Clock className="h-4 w-4" /> {e.day_name} · {e.time}</div>
                          {e.soldOut ? (
                            <div className="flex items-center gap-2 font-bold text-forest-deep"><Ticket className="h-4 w-4" /> Sold out</div>
                          ) : (
                            <div className="flex items-center gap-2"><Ticket className="h-4 w-4" /> ${e.price} · {e.left} seats left</div>
                          )}
                        </div>
                        <div className="mt-6 inline-flex items-center gap-1 font-bold text-forest group-hover:gap-2 transition-all">
                          {e.soldOut ? "View event (sold out)" : "View event"} <ChevronRight className="h-4 w-4" />
                        </div>
                      </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}

export const Route = createFileRoute("/events/")({
  head: () => ({
    meta: [
      { title: "Upcoming Events · Greenhouse Bingo" },
      { name: "description", content: "Browse Greenhouse Bingo events by state and grab tickets to the venue nearest you." },
      { property: "og:title", content: "Upcoming Events · Greenhouse Bingo" },
      { property: "og:description", content: "Browse Greenhouse Bingo events by state and grab tickets to the venue nearest you." },
    ],
  }),
  component: EventsIndex,
});
