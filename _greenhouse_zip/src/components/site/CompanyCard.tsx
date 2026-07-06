import { Link } from "@tanstack/react-router";
import { MapPin, CalendarDays } from "lucide-react";
import { eventsByCompany, type Company } from "@/data/mock";

const accent: Record<string, string> = {
  leaf: "bg-leaf text-leaf-foreground",
  clay: "bg-clay text-clay-foreground",
  moss: "bg-moss text-primary-foreground",
};

export function CompanyCard({ company }: { company: Company }) {
  const count = eventsByCompany(company.slug).length;
  return (
    <Link
      to="/events"
      search={{ company: company.slug }}
      className="group flex gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift"
    >
      <div
        className={`grid h-16 w-16 flex-shrink-0 place-items-center rounded-xl font-display text-2xl font-semibold ${
          accent[company.accentColor] ?? "bg-primary text-primary-foreground"
        }`}
      >
        {company.logoInitials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-display text-lg font-semibold group-hover:underline">
          {company.name}
        </div>
        <div className="text-sm text-muted-foreground">{company.tagline}</div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" /> {company.serviceArea}
          </span>
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3 w-3" /> {count} upcoming
          </span>
        </div>
      </div>
    </Link>
  );
}
