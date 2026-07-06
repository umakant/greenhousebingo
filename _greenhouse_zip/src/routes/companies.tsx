import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { companies } from "@/data/mock";
import { CompanyCard } from "@/components/site/CompanyCard";
import { PageHeader } from "@/components/site/PageHeader";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/companies")({
  head: () => ({
    meta: [
      { title: "Companies & Reps — Greenhouse Bingo" },
      {
        name: "description",
        content: "Every approved Greenhouse Bingo rep and company across the country.",
      },
      { property: "og:title", content: "Companies & Reps — Greenhouse Bingo" },
      {
        property: "og:description",
        content: "Meet the reps hosting plant bingo events near you.",
      },
    ],
  }),
  component: CompaniesPage,
});

const allStates = Array.from(new Set(companies.map((c) => c.state))).sort();

function CompaniesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedState, setSelectedState] = useState<string>("all");
  const [selectedCity, setSelectedCity] = useState<string>("all");

  const availableCities = useMemo(() => {
    const pool = selectedState !== "all"
      ? companies.filter((c) => c.state === selectedState)
      : companies;
    return Array.from(new Set(pool.map((c) => c.city))).sort();
  }, [selectedState]);

  const filteredCompanies = useMemo(() => {
    return companies.filter((c) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        q === "" ||
        c.name.toLowerCase().includes(q) ||
        c.tagline.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        c.state.toLowerCase().includes(q) ||
        c.serviceArea.toLowerCase().includes(q);
      const matchesState = selectedState === "all" || c.state === selectedState;
      const matchesCity = selectedCity === "all" || c.city === selectedCity;
      return matchesSearch && matchesState && matchesCity;
    });
  }, [searchQuery, selectedState, selectedCity]);

  return (
    <>
      <PageHeader
        eyebrow="Directory"
        title="Companies hosting Plant Bingo"
        subtitle="Explore every approved partner on the platform. View their profile, discover their brand, and see upcoming Plant Bingo events in their area."
      />
      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search companies, cities, areas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={selectedState}
            onValueChange={(val) => {
              setSelectedState(val);
              setSelectedCity("all");
            }}
          >
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="State" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All states</SelectItem>
              {allStates.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedCity} onValueChange={setSelectedCity}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="City" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All cities</SelectItem>
              {availableCities.map((city) => (
                <SelectItem key={city} value={city}>
                  {city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid gap-4 md:grid-cols-2">
          {filteredCompanies.map((c) => (
            <CompanyCard key={c.slug} company={c} />
          ))}
        </div>
      </section>
    </>
  );
}
