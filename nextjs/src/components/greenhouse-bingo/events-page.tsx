"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { companies, events, venues } from "@/lib/greenhouse-bingo/mock";
import { EventCard } from "@/components/greenhouse-bingo/event-card";
import { PageHeader } from "@/components/greenhouse-bingo/page-header";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function EventsPageContent() {
  const searchParams = useSearchParams();
  const companyParam = searchParams?.get("company");
  const qParam = searchParams?.get("q") ?? "";
  const stateParam = searchParams?.get("state");
  const cityParam = searchParams?.get("city");

  const [q, setQ] = useState(qParam);
  const [state, setState] = useState<string>(stateParam?.trim() ? stateParam : "all");
  const [company, setCompany] = useState<string>(companyParam ?? "all");
  const [age, setAge] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState(cityParam?.trim() ?? "");

  useEffect(() => {
    setQ(qParam);
    setState(stateParam?.trim() ? stateParam : "all");
    setCityFilter(cityParam?.trim() ?? "");
    if (companyParam) setCompany(companyParam);
  }, [qParam, stateParam, cityParam, companyParam]);

  const states = Array.from(new Set(venues.map((v) => v.state))).sort();

  const filtered = useMemo(() => {
    return events.filter((e) => {
      const v = venues.find((x) => x.id === e.venueId);
      const c = companies.find((x) => x.slug === e.companySlug);
      if (state !== "all" && v?.state !== state) return false;
      if (cityFilter && v?.city?.toLowerCase() !== cityFilter.toLowerCase()) return false;
      if (company !== "all" && e.companySlug !== company) return false;
      if (age !== "all" && e.ageRule !== age) return false;
      if (q) {
        const hay = `${e.title} ${v?.name} ${v?.city} ${c?.name}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [q, state, company, age, cityFilter]);

  return (
    <>
      <PageHeader
        eyebrow="Marketplace"
        title="Every upcoming plant bingo event"
        subtitle="Filter by city, state, company, or age rules. New events added every week."
      />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft md:grid-cols-4">
          <Input
            placeholder="Search title, venue, city…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Select value={state} onValueChange={setState}>
            <SelectTrigger>
              <SelectValue placeholder="State" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All states</SelectItem>
              {states.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={company} onValueChange={setCompany}>
            <SelectTrigger>
              <SelectValue placeholder="Company" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All companies</SelectItem>
              {companies.map((c) => (
                <SelectItem key={c.slug} value={c.slug}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={age} onValueChange={setAge}>
            <SelectTrigger>
              <SelectValue placeholder="Age" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ages / any</SelectItem>
              <SelectItem value="Family">Family friendly</SelectItem>
              <SelectItem value="All ages">All ages</SelectItem>
              <SelectItem value="21+">21+</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mt-4 text-sm text-muted-foreground">
          {filtered.length} event{filtered.length === 1 ? "" : "s"}
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="mt-12 rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
            No events match those filters. Try widening your search.
          </div>
        )}
      </section>
    </>
  );
}
