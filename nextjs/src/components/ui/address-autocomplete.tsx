"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    google?: any;
  }
}

interface GooglePlaceResult {
  address_components?: Array<{ long_name: string; short_name: string; types: string[] }>;
  formatted_address?: string;
  geometry?: { location?: { lat: () => number; lng: () => number } };
}

interface AutocompleteInstance {
  addListener: (event: string, cb: () => void) => void;
  getPlace: () => GooglePlaceResult;
}

/** Matches Laravel GooglePlacesAutocomplete place result (street_address, city, state, zip_code). */
export type AddressComponents = {
  street: string;
  city: string;
  state: string;
  zip: string;
  /** Long name, e.g. "United States" */
  country: string;
  /** ISO 3166-1 alpha-2 from Places `country` short_name (e.g. "US"). */
  countryCode: string;
  /** County / parish (administrative_area_level_2), when available. */
  county: string;
  /** Latitude from `geometry.location.lat()` — null when Places doesn't return geometry. */
  latitude?: number | null;
  /** Longitude from `geometry.location.lng()` — null when Places doesn't return geometry. */
  longitude?: number | null;
  /** Full single-line `formatted_address` from Google (e.g. for storing the display label). */
  formattedAddress?: string;
};

/** Alias for Laravel parity: street_address = street, zip_code = zip. */
export type PlaceResult = {
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
};

function parseAddressComponents(components: Array<{ long_name: string; short_name: string; types: string[] }> | undefined): AddressComponents {
  const out: AddressComponents = { street: "", city: "", state: "", zip: "", country: "", countryCode: "", county: "" };
  if (!components?.length) return out;

  let streetNumber = "";
  let route = "";

  for (const c of components) {
    if (c.types.includes("street_number")) streetNumber = c.long_name;
    if (c.types.includes("route")) route = c.long_name;
    if (c.types.includes("locality") || c.types.includes("postal_town")) out.city = c.long_name;
    if (!out.city && c.types.includes("sublocality_level_1")) out.city = c.long_name;
    if (c.types.includes("administrative_area_level_1")) out.state = c.short_name;
    if (c.types.includes("administrative_area_level_2")) out.county = c.long_name;
    if (c.types.includes("postal_code")) out.zip = c.long_name;
    if (c.types.includes("country")) {
      out.country = c.long_name;
      out.countryCode = (c.short_name || "").trim().toUpperCase();
    }
  }

  out.street = [streetNumber, route].filter(Boolean).join(" ").trim();
  return out;
}

export interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect?: (address: AddressComponents) => void;
  placeholder?: string;
  id?: string;
  className?: string;
  disabled?: boolean;
  /** Override API key (e.g. from app settings). Falls back to NEXT_PUBLIC_GOOGLE_PLACES_API_KEY. */
  apiKey?: string;
  /** Extra props for the inner `<Input />` (e.g. `data-pf-checkout-control` on storefront checkout). */
  inputProps?: Omit<React.ComponentPropsWithoutRef<typeof Input>, "value" | "onChange" | "ref">;
  /**
   * Two-letter ISO country code for Places `componentRestrictions` (e.g. "us").
   * Defaults to US; override with `NEXT_PUBLIC_GOOGLE_PLACES_COUNTRY` when prop is omitted.
   * Pass `""` to disable restriction (worldwide).
   */
  countryRestriction?: string;
}

function resolvePlacesCountry(prop: string | undefined): string {
  const env =
    typeof process !== "undefined" ? process.env.NEXT_PUBLIC_GOOGLE_PLACES_COUNTRY?.trim() : undefined;
  if (prop !== undefined) return prop.trim();
  if (env === undefined) return "us";
  return env;
}

function ensurePacContainerAboveModals() {
  if (typeof document === "undefined") return;
  if (document.querySelector("style[data-pf-address-pac]")) return;
  const style = document.createElement("style");
  style.setAttribute("data-pf-address-pac", "");
  style.textContent =
    ".pac-container{z-index:100000!important;pointer-events:auto!important;}";
  document.head.appendChild(style);
}

export function AddressAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  placeholder = "Start typing an address...",
  id,
  className,
  disabled,
  apiKey: apiKeyProp,
  countryRestriction,
  inputProps,
}: AddressAutocompleteProps) {
  const effectiveCountry = resolvePlacesCountry(countryRestriction);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const autocompleteRef = React.useRef<AutocompleteInstance | null>(null);
  /** Callbacks must stay off the Autocomplete effect deps — inline handlers in parents would recreate Autocomplete every render and break the dropdown. */
  const onChangeRef = React.useRef(onChange);
  const onPlaceSelectRef = React.useRef(onPlaceSelect);
  React.useLayoutEffect(() => {
    onChangeRef.current = onChange;
    onPlaceSelectRef.current = onPlaceSelect;
  });

  const [scriptLoaded, setScriptLoaded] = React.useState(false);
  const [noKey, setNoKey] = React.useState(false);

  const envKey = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY : undefined;
  const apiKey = (apiKeyProp && apiKeyProp.trim()) || envKey || "";

  React.useEffect(() => {
    if (typeof window === "undefined" || !apiKey) {
      if (!apiKey) setNoKey(true);
      return;
    }
    setNoKey(false);

    if (window.google?.maps?.places?.Autocomplete) {
      setScriptLoaded(true);
      return;
    }

    const existing = document.querySelector(`script[src^="https://maps.googleapis.com/maps/api/js"]`);
    if (existing) {
      if (window.google?.maps?.places) setScriptLoaded(true);
      else existing.addEventListener("load", () => setScriptLoaded(true));
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => setScriptLoaded(true);
    script.onerror = () => setNoKey(true);
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, [apiKey]);

  React.useEffect(() => {
    const g = typeof window !== "undefined" ? window.google : undefined;
    if (!scriptLoaded || !g?.maps?.places?.Autocomplete) return;

    let cancelled = false;
    let rafId = 0;
    let attempts = 0;
    const maxAttempts = 180;

    const attach = () => {
      if (cancelled) return;
      const input = inputRef.current;
      if (!input) {
        if (attempts++ < maxAttempts) rafId = requestAnimationFrame(attach);
        return;
      }
      if (autocompleteRef.current) return;

      ensurePacContainerAboveModals();

      const opts: {
        types: string[];
        fields: string[];
        componentRestrictions?: { country: string };
      } = {
        types: ["address"],
        fields: ["address_components", "formatted_address", "geometry.location"],
      };
      if (effectiveCountry) opts.componentRestrictions = { country: effectiveCountry };

      const Autocomplete = g.maps.places.Autocomplete as new (input: HTMLInputElement, opts?: object) => AutocompleteInstance;
      const autocomplete = new Autocomplete(input, opts);

      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        const components = place?.address_components;
        const parsed = parseAddressComponents(components);
        const loc = place?.geometry?.location;
        if (loc && typeof loc.lat === "function" && typeof loc.lng === "function") {
          try {
            parsed.latitude = loc.lat();
            parsed.longitude = loc.lng();
          } catch {
            parsed.latitude = null;
            parsed.longitude = null;
          }
        }
        if (place?.formatted_address) {
          parsed.formattedAddress = place.formatted_address;
        }
        const streetVal = parsed.street || place?.formatted_address || "";
        if (streetVal) {
          onChangeRef.current(streetVal);
          onPlaceSelectRef.current?.(parsed);
        }
      });

      autocompleteRef.current = autocomplete;
    };

    attach();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      if (autocompleteRef.current && window.google?.maps?.event?.clearInstanceListeners) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
      autocompleteRef.current = null;
    };
  }, [scriptLoaded, effectiveCountry]);

  if (!apiKey || noKey) {
    return (
      <Input
        {...inputProps}
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(className, inputProps?.className)}
        disabled={disabled}
      />
    );
  }

  return (
    <Input
      {...inputProps}
      ref={inputRef}
      id={id}
      type="text"
      autoComplete="off"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={scriptLoaded ? placeholder : "Loading..."}
      className={cn(className, inputProps?.className)}
      disabled={disabled}
    />
  );
}
