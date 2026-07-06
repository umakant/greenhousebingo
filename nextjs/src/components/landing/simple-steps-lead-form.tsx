"use client";

import * as React from "react";
import { ChevronRight } from "lucide-react";
import { loadGoogleMaps } from "@/components/account/google-address-input";
import { cn } from "@/lib/utils";

const GMAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY ?? "";
const COUNTRY_RESTRICTION = (() => {
  const raw = process.env.NEXT_PUBLIC_GOOGLE_PLACES_COUNTRY?.trim();
  if (raw === undefined) return "us";
  return raw;
})();

/** Reference teal for “Setting up is simple” lead form */
export const STEPS_FORM_TEAL = "#38a18c";
const DROPDOWN_BG = "#1c2333";
const LABEL_GRAY = "#6b7280";

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

type FocusField = "address" | "name" | "email";

function FieldCell({
  active,
  children,
  className,
}: {
  active: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col justify-center px-2.5 py-2 transition-[background-color,border-radius] sm:px-3 sm:py-2.5",
        active && "rounded-full sm:mx-0.5 sm:my-1",
        className,
      )}
      style={active ? { backgroundColor: "rgba(56, 161, 140, 0.12)" } : undefined}
    >
      {children}
    </div>
  );
}

/**
 * Horizontal pill: Address (Google geocode) + full name + email + FIND YOUR BLOCK CTA.
 * Matches landing “steps” section reference.
 */
export function SimpleStepsLeadForm({ className }: { className?: string }) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const addressInputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);
  const sessionRef = React.useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const acServiceRef = React.useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = React.useRef<google.maps.places.PlacesService | null>(null);

  const [focus, setFocus] = React.useState<FocusField>("address");
  const [address, setAddress] = React.useState("");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [predictions, setPredictions] = React.useState<google.maps.places.AutocompletePrediction[]>([]);
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [highlight, setHighlight] = React.useState(-1);
  const [mapsReady, setMapsReady] = React.useState(false);

  const debouncedAddr = useDebounced(address.trim(), 280);

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
    if (!debouncedAddr) {
      setPredictions([]);
      setOpen(false);
      setHighlight(-1);
      setLoading(false);
      return;
    }
    if (!mapsReady || !acServiceRef.current) return;

    setLoading(true);
    ensureSession();

    const req: google.maps.places.AutocompletionRequest = {
      input: debouncedAddr,
      sessionToken: sessionRef.current ?? undefined,
      types: ["geocode"],
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
  }, [debouncedAddr, mapsReady, ensureSession]);

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

  const resolvePlace = React.useCallback((prediction: google.maps.places.AutocompletePrediction) => {
    const ps = placesServiceRef.current;
    const finish = (addr: string) => {
      setAddress(addr);
      setOpen(false);
      setPredictions([]);
      sessionRef.current = window.google?.maps?.places
        ? new window.google.maps.places.AutocompleteSessionToken()
        : null;
    };
    if (!ps || !prediction.place_id) {
      finish(prediction.description);
      return;
    }
    ps.getDetails(
      {
        placeId: prediction.place_id,
        fields: ["formatted_address"],
        sessionToken: sessionRef.current ?? undefined,
      },
      (place, status) => {
        const g = window.google?.maps?.places;
        const addr =
          g && status === g.PlacesServiceStatus.OK ? (place?.formatted_address ?? prediction.description) : prediction.description;
        finish(addr);
      },
    );
  }, []);

  const onPick = (p: google.maps.places.AutocompletePrediction) => {
    resolvePlace(p);
    addressInputRef.current?.focus();
  };

  const onAddrNotListed = () => {
    setOpen(false);
    setPredictions([]);
    sessionRef.current = window.google?.maps?.places
      ? new window.google.maps.places.AutocompleteSessionToken()
      : null;
  };

  const onKeyDownAddr = (e: React.KeyboardEvent) => {
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

  const showPanel = Boolean(GMAPS_API_KEY && mapsReady && open && debouncedAddr && !loading);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const divider = <div className="hidden h-10 w-px shrink-0 self-center bg-slate-200 sm:block" aria-hidden />;

  return (
    <form className={cn("relative", className)} onSubmit={submit} data-testid="form-simple-steps-lead">
      <div ref={rootRef} className="relative z-10">
        <div
          className="flex flex-col gap-2 rounded-full border-2 bg-white p-2 shadow-sm sm:flex-row sm:items-stretch sm:gap-0 sm:p-1.5 sm:pr-1.5"
          style={{ borderColor: STEPS_FORM_TEAL }}
        >
          <FieldCell active={focus === "address"} className="min-w-0 flex-[1.4] sm:rounded-l-[1.25rem]">
            <label htmlFor="steps-lead-address" className="text-[10px] font-medium sm:text-[11px]" style={{ color: LABEL_GRAY }}>
              Address
            </label>
            <input
              ref={addressInputRef}
              id="steps-lead-address"
              name="address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onFocus={() => {
                setFocus("address");
                if (predictions.length) setOpen(true);
              }}
              onKeyDown={onKeyDownAddr}
              autoComplete="off"
              placeholder="Start typing your street address…"
              className="mt-0.5 min-w-0 border-0 bg-transparent p-0 text-xs text-[#1a1a1a] outline-none placeholder:text-slate-400 sm:text-sm"
            />
          </FieldCell>

          {divider}

          <FieldCell active={focus === "name"} className="min-w-0 flex-1">
            <label htmlFor="steps-lead-name" className="text-[10px] font-medium sm:text-[11px]" style={{ color: LABEL_GRAY }}>
              Name
            </label>
            <input
              id="steps-lead-name"
              name="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onFocus={() => setFocus("name")}
              placeholder="Jason Bowman"
              autoComplete="name"
              className="mt-0.5 min-w-0 border-0 bg-transparent p-0 text-xs text-[#1a1a1a] outline-none placeholder:text-slate-400 sm:text-sm"
            />
          </FieldCell>

          {divider}

          <FieldCell active={focus === "email"} className="min-w-0 flex-1">
            <label htmlFor="steps-lead-email" className="text-[10px] font-medium sm:text-[11px]" style={{ color: LABEL_GRAY }}>
              Email
            </label>
            <input
              id="steps-lead-email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocus("email")}
              placeholder="you@email.com"
              autoComplete="email"
              className="mt-0.5 min-w-0 border-0 bg-transparent p-0 text-xs text-[#1a1a1a] outline-none placeholder:text-slate-400 sm:text-sm"
            />
          </FieldCell>

          <button
            type="submit"
            className="mt-1 inline-flex w-full shrink-0 items-center justify-center gap-2 self-center rounded-full px-4 py-3 text-xs font-bold tracking-wide text-white sm:mt-0 sm:ml-1 sm:w-auto sm:px-5 sm:py-2.5 sm:text-sm"
            style={{ backgroundColor: STEPS_FORM_TEAL }}
            data-testid="button-find-your-block-steps"
          >
            FIND YOUR BLOCK
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white">
              <ChevronRight className="h-4 w-4" style={{ color: STEPS_FORM_TEAL }} strokeWidth={2.5} />
            </span>
          </button>
        </div>

        {showPanel && (
          <div
            className="absolute left-0 right-0 top-[calc(100%+6px)] overflow-hidden rounded-lg shadow-xl ring-1 ring-black/20"
            style={{ backgroundColor: DROPDOWN_BG }}
            role="listbox"
            aria-label="Address suggestions"
          >
            <ul
              ref={listRef}
              className="max-h-[220px] overflow-y-auto py-1 [scrollbar-color:rgba(255,255,255,0.35)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/35"
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
              onClick={onAddrNotListed}
              className="w-full border-t border-white/10 px-3 py-2.5 text-left text-sm text-white/90 transition-colors hover:bg-white/[0.06] sm:px-4"
            >
              My address isn&apos;t listed
            </button>
            <div className="flex items-center justify-end border-t border-white/10 px-2 py-1.5">
              <span className="text-[10px] text-white/50">Powered by Google</span>
            </div>
          </div>
        )}
      </div>
    </form>
  );
}
