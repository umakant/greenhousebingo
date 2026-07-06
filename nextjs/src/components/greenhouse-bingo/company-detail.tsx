import Link from "next/link";
import { Instagram, Globe, MapPin } from "lucide-react";
import { eventsByCompany, type Company } from "@/lib/greenhouse-bingo/mock";
import { EventCard } from "@/components/greenhouse-bingo/event-card";
import { Button } from "@/components/ui/button";

const accent: Record<string, string> = {
  leaf: "bg-leaf text-leaf-foreground",
  clay: "bg-clay text-clay-foreground",
  moss: "bg-moss text-primary-foreground",
};

export function CompanyDetailContent({ company }: { company: Company }) {
  const upcoming = eventsByCompany(company.slug);

  return (
    <>
      <section className="border-b border-border/60 bg-gradient-to-b from-secondary/70 to-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20">
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <div
              className={`grid h-24 w-24 place-items-center rounded-2xl font-display text-4xl font-semibold shadow-lift ${
                accent[company.accentColor] ?? "bg-primary text-primary-foreground"
              }`}
            >
              {company.logoInitials}
            </div>
            <div className="flex-1">
              <div className="text-xs font-semibold uppercase tracking-widest text-primary">
                Rep · {company.serviceArea}
              </div>
              <h1 className="mt-1 font-display text-4xl md:text-5xl">{company.name}</h1>
              <p className="mt-2 max-w-2xl text-muted-foreground">{company.tagline}</p>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-4 w-4" /> {company.city}, {company.state}
                </span>
                {company.instagram && (
                  <span className="inline-flex items-center gap-1">
                    <Instagram className="h-4 w-4" /> {company.instagram}
                  </span>
                )}
                {company.website && (
                  <span className="inline-flex items-center gap-1">
                    <Globe className="h-4 w-4" /> {company.website}
                  </span>
                )}
              </div>
            </div>
            <Button size="lg" asChild>
              <Link href="/contact">Contact</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1fr_2fr]">
          <div>
            <h2 className="font-display text-2xl">About</h2>
            <p className="mt-3 text-muted-foreground">{company.about}</p>
          </div>
          <div>
            <h2 className="font-display text-2xl">Upcoming events ({upcoming.length})</h2>
            <div className="mt-4 grid gap-6 sm:grid-cols-2">
              {upcoming.map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
            </div>
            {upcoming.length === 0 && (
              <div className="mt-4 rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
                No upcoming events yet — check back soon.
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
