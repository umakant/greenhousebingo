"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { Button } from "@/components/ui/button";

function buildEventsSearchUrl(parts: { q?: string; city?: string; state?: string }): string {
  const params = new URLSearchParams();
  if (parts.q?.trim()) params.set("q", parts.q.trim());
  if (parts.city?.trim()) params.set("city", parts.city.trim());
  if (parts.state?.trim()) params.set("state", parts.state.trim());
  const qs = params.toString();
  return qs ? `/events?${qs}` : "/events";
}

export function GreenhouseHeroLocationSearch() {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const placeRef = React.useRef<{ city?: string; state?: string }>({});

  function goSearch() {
    router.push(
      buildEventsSearchUrl({
        q: query,
        city: placeRef.current.city,
        state: placeRef.current.state,
      }),
    );
  }

  return (
    <form
      className="mt-8 flex max-w-lg overflow-hidden rounded-full border border-border bg-card shadow-soft"
      onSubmit={(e) => {
        e.preventDefault();
        goSearch();
      }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2 pl-5">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <AddressAutocomplete
          value={query}
          onChange={(v) => {
            setQuery(v);
            if (!v.trim()) placeRef.current = {};
          }}
          onPlaceSelect={(parsed) => {
            placeRef.current = {
              city: parsed.city || undefined,
              state: parsed.state || undefined,
            };
            const label =
              parsed.city && parsed.state
                ? `${parsed.city}, ${parsed.state}`
                : parsed.formattedAddress || parsed.street || query;
            if (label) setQuery(label);
          }}
          placeholder="Search by city, state, or address"
          placeTypes={["geocode"]}
          className="h-11 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          inputProps={{
            autoComplete: "off",
            className: "h-11 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0",
            "aria-label": "Search location",
          }}
        />
      </div>
      <Button type="submit" size="lg" className="m-1 shrink-0 rounded-full">
        Search
      </Button>
    </form>
  );
}
