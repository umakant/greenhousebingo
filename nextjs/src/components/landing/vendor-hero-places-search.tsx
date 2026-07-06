"use client";

import * as React from "react";
import { ArrowRight } from "lucide-react";
import { loadGoogleMaps } from "@/components/account/google-address-input";
import { cn } from "@/lib/utils";

const GMAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY ?? "";

const COUNTRY_RESTRICTION = (() => {
  const raw = process.env.NEXT_PUBLIC_GOOGLE_PLACES_COUNTRY?.trim();
  if (raw === undefined) return "us";
  return raw;
})();

const HERO_TEAL = "#2da681";
const DROPDOWN_BG = "#1c2333";
const LABEL_COLOR = "#102a2e";

export type VendorHeroPlacePick = {
  placeId: string;
  description: string;
  formattedAddress?: string;
};

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

/**
 * Vendor hero search: floating "Business Name" label, teal pill border, Google Places predictions
 * in a custom navy panel (matches marketing reference). Requires NEXT_PUBLIC_GOOGLE_PLACES_API_KEY.
 */
export function VendorHeroPlacesSearch({
  className,
  onExplore,
}: {
  className?: string;
  onExplore?: (pick: VendorHeroPlacePick | null, query: string) => void;
}) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);
  const sessionRef = React.useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const acServiceRef = React.useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = React.useRef<google.maps.places.PlacesService | null>(null);

  const [value, setValue] = React.useState("");
  const [predictions, setPredictions] = React.useState<google.maps.places.AutocompletePrediction[]>([]);
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [highlight, setHighlight] = React.useState(-1);
  const [selected, setSelected] = React.useState<VendorHeroPlacePick | null>(null);
  const [mapsReady, setMapsReady] = React.useState(false);

  const debounced = useDebounced(value.trim(), 280);

  React.useEffect(() => {
    if (!GMAPS_API_KEY) return;
    let cancelled = false;
    loadGoogleMaps()
      .then(() => {
        if (cancelled || typeof window === "undefined") return;
        if (!window.google?.maps?.places) return;
        acServiceRef.current = new window.google.maps.places.AutocompleteService();
        placesServiceRef.current = new window.google.maps.places.PlacesService(document.createElement("div"));
        sessionRef.current = new window.google.maps.places.AutocompleteSessionToken();
        setMapsReady(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const ensureSession = React.useCallback(() => {
    if (!window.google?.maps?.places) return;
    if (!sessionRef.current) {
      sessionRef.current = new window.google.maps.places.AutocompleteSessionToken();
    }
  }, []);

  React.useEffect(() => {
    if (!debounced) {
      setPredictions([]);
      setOpen(false);
      setHighlight(-1);
      setLoading(false);
      return;
    }
    if (!mapsReady || !acServiceRef.current) {
      return;
    }

    setLoading(true);
    ensureSession();

    const req: google.maps.places.AutocompletionRequest = {
      input: debounced,
      sessionToken: sessionRef.current ?? undefined,
    };
    if (COUNTRY_RESTRICTION) {
      req.componentRestrictions = { country: COUNTRY_RESTRICTION };
    }

    acServiceRef.current.getPlacePredictions(req, (results, status) => {
      setLoading(false);
      const g = window.google?.maps?.places;
      const ok = g && status === g.PlacesServiceStatus.OK;
      setPredictions(ok && results?.length ? results.slice(0, 8) : []);
      setOpen(true);
      setHighlight(-1);
    });
  }, [debounced, mapsReady, ensureSession]);

  React.useEffect(() => {
    function onDocDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setHighlight(-1);
      }
    }
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, []);

  const resolvePlace = React.useCallback(
    (prediction: google.maps.places.AutocompletePrediction) => {
      const ps = placesServiceRef.current;
      if (!ps || !prediction.place_id) {
        const pick: VendorHeroPlacePick = {
          placeId: prediction.place_id,
          description: prediction.description,
        };
        setValue(prediction.description);
        setSelected(pick);
        setOpen(false);
        setPredictions([]);
        sessionRef.current = window.google?.maps?.places
          ? new window.google.maps.places.AutocompleteSessionToken()
          : null;
        return;
      }
      ps.getDetails(
        {
          placeId: prediction.place_id,
          fields: ["formatted_address", "name", "place_id"],
          sessionToken: sessionRef.current ?? undefined,
        },
        (place, status) => {
          const g = window.google?.maps?.places;
          const addr =
            g && status === g.PlacesServiceStatus.OK ? (place?.formatted_address ?? prediction.description) : prediction.description;
          setValue(addr);
          const pick: VendorHeroPlacePick = {
            placeId: prediction.place_id,
            description: prediction.description,
            formattedAddress: place?.formatted_address ?? undefined,
          };
          setSelected(pick);
          setOpen(false);
          setPredictions([]);
          sessionRef.current = window.google?.maps?.places
            ? new window.google.maps.places.AutocompleteSessionToken()
            : null;
        },
      );
    },
    [],
  );

  const onPick = (p: google.maps.places.AutocompletePrediction) => {
    resolvePlace(p);
    inputRef.current?.focus();
  };

  const onNotListed = () => {
    setSelected(null);
    setOpen(false);
    setPredictions([]);
    sessionRef.current = window.google?.maps?.places
      ? new window.google.maps.places.AutocompleteSessionToken()
      : null;
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onExplore?.(selected, value);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || (!predictions.length && e.key !== "Escape")) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, predictions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" && highlight >= 0 && predictions[highlight]) {
      e.preventDefault();
      onPick(predictions[highlight]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setHighlight(-1);
    }
  };

  React.useEffect(() => {
    if (highlight < 0 || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-idx="${highlight}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [highlight]);

  const showPanel = Boolean(GMAPS_API_KEY && mapsReady && open && debounced && !loading);

  return (
    <form className={cn("relative", className)} onSubmit={submit} data-testid="form-vendor-hero">
      <div ref={rootRef} className="relative z-20">
        <div
          className={cn(
            "flex min-h-[64px] items-stretch overflow-hidden rounded-full border-2 bg-white pl-4 pr-1.5 shadow-md sm:min-h-[68px] sm:pl-5",
          )}
          style={{ borderColor: HERO_TEAL }}
        >
          <div className="flex min-w-0 flex-1 flex-col justify-center py-2.5 pr-2">
            <label htmlFor="hero-business" className="text-[11px] font-semibold leading-tight sm:text-xs" style={{ color: LABEL_COLOR }}>
              Business Name
            </label>
            <input
              ref={inputRef}
              id="hero-business"
              name="business"
              type="text"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setSelected(null);
              }}
              onFocus={() => {
                if (predictions.length) setOpen(true);
              }}
              onKeyDown={onKeyDown}
              autoComplete="off"
              placeholder=""
              className="mt-0.5 min-w-0 border-0 bg-transparent p-0 text-sm text-[#1A2B3C] outline-none selection:bg-[#bfe9dc] selection:text-[#102a2e] placeholder:text-slate-400 sm:text-[15px]"
            />
          </div>
          <button
            type="submit"
            className="my-2 inline-flex shrink-0 items-center gap-2 self-center rounded-full px-4 py-2.5 text-xs font-bold tracking-wide text-white sm:px-5 sm:text-sm"
            style={{ backgroundColor: HERO_TEAL }}
            data-testid="button-explore-now"
          >
            EXPLORE NOW
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
              <ArrowRight className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
            </span>
          </button>
        </div>

        {!GMAPS_API_KEY && (
          <p className="mt-2 text-xs text-[#1A2B3C]/70">
            Add <code className="rounded bg-black/[0.06] px-1">NEXT_PUBLIC_GOOGLE_PLACES_API_KEY</code> for live address suggestions.
          </p>
        )}

        {showPanel && (
          <div
            className="absolute left-0 right-0 top-[calc(100%+6px)] overflow-hidden rounded-lg shadow-xl ring-1 ring-black/20"
            style={{ backgroundColor: DROPDOWN_BG }}
            role="listbox"
            aria-label="Place suggestions"
          >
            <ul
              ref={listRef}
              className="max-h-[240px] overflow-y-auto py-1 [scrollbar-color:rgba(255,255,255,0.35)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/35"
            >
              {predictions.map((p, idx) => (
                <li key={p.place_id}>
                  <button
                    type="button"
                    data-idx={idx}
                    role="option"
                    aria-selected={highlight === idx}
                    onMouseEnter={() => setHighlight(idx)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => onPick(p)}
                    className={cn(
                      "w-full px-3 py-2.5 text-left text-sm leading-snug text-white/95 transition-colors sm:px-4",
                      highlight === idx ? "bg-white/[0.12]" : "hover:bg-white/[0.08]",
                    )}
                  >
                    {p.description}
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={onNotListed}
              className="w-full border-t border-white/10 px-3 py-2.5 text-left text-sm text-white/90 transition-colors hover:bg-white/[0.06] sm:px-4"
            >
              I don&apos;t see my business
            </button>
            <div className="flex items-center justify-end gap-2 border-t border-white/10 px-2 py-1.5">
              <span className="text-[10px] text-white/50">Powered by Google</span>
            </div>
          </div>
        )}
      </div>
    </form>
  );
}
