"use client";

import * as React from "react";
import { ArrowRight, Play } from "lucide-react";
import { loadGoogleMaps } from "@/components/account/google-address-input";
import { cn } from "@/lib/utils";

const GMAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY ?? "";
const COUNTRY_RESTRICTION = (() => {
  const raw = process.env.NEXT_PUBLIC_GOOGLE_PLACES_COUNTRY?.trim();
  if (raw === undefined) return "us";
  return raw;
})();

const BULK_NAVY = "#1A2B3C";
const HERO_TEAL = "#2da681";
const HERO_MINT = "#e6f4ef";
const HERO_CREAM = "#f7f3eb";
const DROPDOWN_BG = "#1c2333";
const LABEL_COLOR = "#102a2e";
const MINT_FOCUS = "rgba(207, 233, 222, 0.92)";

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

function HomeownerHeroSplitBg() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0" style={{ backgroundColor: HERO_CREAM }} />
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1440 640" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <path
          fill={HERO_MINT}
          d="M0,0 L0,640 L520,640 Q 620 520 680 400 Q 740 260 820 200 Q 900 120 1000 80 Q 1120 40 1280 20 Q 1360 10 1440 0 Z"
        />
      </svg>
    </div>
  );
}

function WaveformBars({ className }: { className?: string }) {
  const heights = [4, 10, 6, 14, 8, 12, 5, 11, 7, 9];
  return (
    <div className={cn("flex items-end gap-0.5", className)} aria-hidden>
      {heights.map((h, i) => (
        <span key={i} className="w-0.5 rounded-full bg-white/90" style={{ height: h }} />
      ))}
    </div>
  );
}

type FocusField = "address" | "first" | "last" | "email";

function FieldShell({
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
      style={active ? { backgroundColor: MINT_FOCUS } : undefined}
    >
      {children}
    </div>
  );
}

function HomeownerIsometricBlock() {
  return (
    <div className="relative mx-auto w-full max-w-[520px] lg:max-w-[560px]">
      <svg viewBox="0 0 440 380" className="h-auto w-full drop-shadow-xl" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <defs>
          <pattern id="isoGrid" width="24" height="24" patternUnits="userSpaceOnUse" patternTransform="skewX(-26)">
            <path d="M0 24 L24 24 M24 0 L24 24" stroke="#b8dcc8" strokeWidth="0.5" opacity="0.45" />
          </pattern>
        </defs>
        <rect x="0" y="0" width="440" height="380" fill={HERO_MINT} />
        <rect x="-40" y="60" width="520" height="360" fill="url(#isoGrid)" opacity="0.6" />
        <g transform="translate(220 200)">
          <g transform="skewX(-26) scale(1,0.58)">
            <rect x="-120" y="-40" width="240" height="120" rx="10" stroke="#14b8a6" strokeWidth="2.5" strokeDasharray="7 6" fill="rgba(255,255,255,0.35)" />
          </g>
          <g transform="translate(-95 -10)">
            <polygon points="0,-38 22,-18 22,18 0,28 -22,18 -22,-18" fill="#f8fafc" stroke="#e2e8f0" />
            <polygon points="0,-38 -18,-22 18,-22" fill="#ea580c" opacity="0.9" />
            <rect x="-10" y="-2" width="20" height="16" fill="#38bdf8" opacity="0.25" rx="2" />
          </g>
          <g transform="translate(-25 25)">
            <polygon points="0,-32 18,-14 18,16 0,24 -18,16 -18,-14" fill="#f8fafc" stroke="#e2e8f0" />
            <polygon points="0,-32 -15,-18 15,-18" fill="#f97316" opacity="0.85" />
          </g>
          <g transform="translate(55 -5)">
            <polygon points="0,-36 20,-16 20,18 0,26 -20,18 -20,-16" fill="#f8fafc" stroke="#e2e8f0" />
            <polygon points="0,-36 -17,-20 17,-20" fill="#fb923c" opacity="0.9" />
            <ellipse cx="0" cy="8" rx="14" ry="6" fill="#38bdf8" opacity="0.35" />
          </g>
          <g transform="translate(105 35)">
            <polygon points="0,-30 16,-12 16,14 0,22 -16,14 -16,-12" fill="#f8fafc" stroke="#e2e8f0" />
            <polygon points="0,-30 -14,-16 14,-16" fill="#ea580c" opacity="0.88" />
          </g>
          <g transform="translate(40 95)">
            <rect x="-36" y="-14" width="72" height="26" rx="13" fill="#22c55e" />
            <text x="0" y="4" textAnchor="middle" fill="white" fontSize="11" fontWeight="700" fontFamily="system-ui, sans-serif">
              A BLOCK
            </text>
          </g>
        </g>
        <g transform="translate(95 118)">
          <rect x="0" y="0" width="78" height="28" rx="8" fill="white" stroke="#e2e8f0" />
          <text x="39" y="19" textAnchor="middle" fill="#1A2B3C" fontSize="10" fontWeight="600" fontFamily="system-ui, sans-serif">
            Lawn Care
          </text>
          <path d="M78 14 H95 L105 8" stroke="#cbd5e1" strokeWidth="1.5" fill="none" />
        </g>
        <g transform="translate(268 148)">
          <rect x="0" y="0" width="78" height="28" rx="8" fill="white" stroke="#e2e8f0" />
          <text x="39" y="19" textAnchor="middle" fill="#1A2B3C" fontSize="10" fontWeight="600" fontFamily="system-ui, sans-serif">
            Lawn Care
          </text>
          <path d="M0 14 H-12 L-22 20" stroke="#cbd5e1" strokeWidth="1.5" fill="none" />
        </g>
      </svg>
    </div>
  );
}

/**
 * Homeowner hero lead form: address (Google Places) + name + email in one mint-bordered pill, "FIND YOUR BLOCK" CTA.
 */
export function HomeownerLeadBar({ className }: { className?: string }) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const addressInputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);
  const sessionRef = React.useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const acServiceRef = React.useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = React.useRef<google.maps.places.PlacesService | null>(null);

  const [focus, setFocus] = React.useState<FocusField>("first");
  const [address, setAddress] = React.useState("");
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
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
    <form className={cn("relative", className)} onSubmit={submit} data-testid="form-homeowner-hero">
      <div ref={rootRef} className="relative z-20">
        <div
          className="flex flex-col gap-2 rounded-[1.75rem] border-2 bg-white p-2 shadow-md sm:flex-row sm:items-stretch sm:gap-0 sm:p-1.5 sm:pr-1.5"
          style={{ borderColor: HERO_TEAL }}
        >
          <FieldShell active={focus === "address"} className="min-w-0 flex-[1.35] sm:rounded-l-[1.25rem]">
            <label htmlFor="hero-address" className="text-[10px] font-semibold leading-tight sm:text-[11px]" style={{ color: LABEL_COLOR }}>
              Enter Your Address
            </label>
            <input
              ref={addressInputRef}
              id="hero-address"
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
              placeholder="1515 Hollywood Blvd..."
              className="mt-0.5 min-w-0 border-0 bg-transparent p-0 text-xs text-[#1A2B3C] outline-none placeholder:text-slate-400 sm:text-sm"
            />
          </FieldShell>

          {divider}

          <FieldShell active={focus === "first"} className="min-w-0 flex-1">
            <label htmlFor="hero-first" className="sr-only">
              First name
            </label>
            <input
              id="hero-first"
              name="firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              onFocus={() => setFocus("first")}
              placeholder="Enter First Name"
              autoComplete="given-name"
              className="min-w-0 border-0 bg-transparent p-0 text-xs text-[#1A2B3C] outline-none placeholder:text-slate-400 sm:text-sm"
            />
          </FieldShell>

          {divider}

          <FieldShell active={focus === "last"} className="min-w-0 flex-1">
            <label htmlFor="hero-last" className="sr-only">
              Last name
            </label>
            <input
              id="hero-last"
              name="lastName"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              onFocus={() => setFocus("last")}
              placeholder="Enter Last Name"
              autoComplete="family-name"
              className="min-w-0 border-0 bg-transparent p-0 text-xs text-[#1A2B3C] outline-none placeholder:text-slate-400 sm:text-sm"
            />
          </FieldShell>

          {divider}

          <FieldShell active={focus === "email"} className="min-w-0 flex-1">
            <label htmlFor="hero-email" className="sr-only">
              Email
            </label>
            <input
              id="hero-email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocus("email")}
              placeholder="Enter Email"
              autoComplete="email"
              className="min-w-0 border-0 bg-transparent p-0 text-xs text-[#1A2B3C] outline-none placeholder:text-slate-400 sm:text-sm"
            />
          </FieldShell>

          <button
            type="submit"
            className="mt-1 inline-flex w-full shrink-0 items-center justify-center gap-2 self-center rounded-full px-4 py-3 text-xs font-bold tracking-wide text-white sm:mt-0 sm:ml-1 sm:w-auto sm:px-4 sm:py-2.5 md:px-5 md:text-sm"
            style={{ backgroundColor: HERO_TEAL }}
            data-testid="button-find-your-block"
          >
            FIND YOUR BLOCK
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
              <ArrowRight className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
            </span>
          </button>
        </div>

        {!GMAPS_API_KEY && (
          <p className="mt-2 text-xs text-[#1A2B3C]/70">
            Add <code className="rounded bg-black/[0.06] px-1">NEXT_PUBLIC_GOOGLE_PLACES_API_KEY</code> for address suggestions.
          </p>
        )}

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

export function HomeownerBulqitHero() {
  return (
    <section className="relative overflow-hidden pb-16 pt-6 sm:pb-20 sm:pt-8">
      <HomeownerHeroSplitBg />
      <div
        className="relative z-10 mx-auto flex max-w-7xl flex-col gap-12 px-4 sm:px-6 lg:flex-row lg:items-center lg:gap-16 lg:px-10"
        style={{ color: BULK_NAVY }}
      >
        <div className="min-w-0 flex-1 pt-4 lg:max-w-2xl">
          <h1 className="text-balance text-3xl font-bold leading-[1.12] tracking-tight sm:text-4xl md:text-[2.5rem] md:leading-[1.12]">
            <span className="block">Join your Block. Bulk home services.</span>
            <span className="mt-1 block font-serif text-3xl font-bold italic text-[#2da681] sm:text-4xl md:text-[2.65rem]">Just Bulqit.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-[#1A2B3C]/70 sm:text-lg">
            We group nearby homes to get better deals on lawn, pool, and outdoor care.
          </p>
          <HomeownerLeadBar className="mt-9 max-w-3xl" />
          <div className="mt-5 flex max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/75 shadow-sm backdrop-blur-sm sm:flex-row sm:rounded-full">
            <div className="flex flex-1 items-center px-4 py-2.5 sm:py-3">
              <span className="text-sm font-semibold text-[#1A2B3C]">What&apos;s a Bulqit Block?</span>
            </div>
            <div className="flex min-w-0 flex-[1.05] items-center gap-2 bg-[#1A2B3C] px-3 py-2 sm:rounded-full sm:px-4">
              <Play className="h-4 w-4 shrink-0 fill-white text-white" aria-hidden />
              <WaveformBars className="flex h-4 max-w-[100px] flex-1 opacity-90" />
              <span className="ml-auto shrink-0 text-xs font-semibold tabular-nums text-white">0:32</span>
            </div>
          </div>
        </div>
        <div className="relative flex flex-1 justify-center lg:justify-end lg:pt-4">
          <HomeownerIsometricBlock />
        </div>
      </div>
    </section>
  );
}
