"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { loadGoogleMapsApi, resolveGoogleMapsApiKey } from "@/lib/google-maps-loader";

/**
 * Places `componentRestrictions.country`. Defaults to US when env is unset.
 * Set `NEXT_PUBLIC_GOOGLE_PLACES_COUNTRY=` (empty) in `.env` for worldwide suggestions.
 */
const COUNTRY_RESTRICTION = (() => {
  const raw = process.env.NEXT_PUBLIC_GOOGLE_PLACES_COUNTRY?.trim();
  if (raw === undefined) return "us";
  return raw;
})();

/** @deprecated Prefer `loadGoogleMapsApi` from `@/lib/google-maps-loader`. */
export function loadGoogleMaps(settingsKey?: string | null): Promise<void> {
  return loadGoogleMapsApi(settingsKey, ["places"]);
}

export type GoogleAddressParsed = {
  address_line_1: string;
  address_line_2: string;
  city: string;
  state: string;
  country: string;
  zip_code: string;
};

export function parseGoogleAddressComponents(
  components: google.maps.GeocoderAddressComponent[],
): GoogleAddressParsed {
  const get = (type: string) =>
    components.find((c) => c.types.includes(type))?.long_name ?? "";
  const getShort = (type: string) =>
    components.find((c) => c.types.includes(type))?.short_name ?? "";
  return {
    address_line_1: [get("street_number"), get("route")].filter(Boolean).join(" "),
    address_line_2: get("subpremise"),
    city:
      get("locality") ||
      get("sublocality") ||
      get("administrative_area_level_2"),
    state: get("administrative_area_level_1"),
    country: get("country"),
    zip_code: getShort("postal_code"),
  };
}

function ensurePacContainerAboveModals() {
  if (document.querySelector("style[data-pf-pac-z-index]")) return;
  const style = document.createElement("style");
  style.setAttribute("data-pf-pac-z-index", "1");
  style.textContent =
    ".pac-container{z-index:100000!important;pointer-events:auto!important;}";
  document.head.appendChild(style);
}

/**
 * Google Places Autocomplete on a controlled input. Callbacks must stay stable — we store them in refs
 * so the Autocomplete instance is not torn down on every parent re-render (which breaks the dropdown).
 */
export function GoogleAddressInput({
  value,
  onChange,
  onPlaceSelected,
  placeholder,
  id,
  disabled,
  apiKey: apiKeyProp,
}: {
  value: string;
  onChange: (v: string) => void;
  onPlaceSelected: (result: GoogleAddressParsed) => void;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  /** From Settings → System Settings; falls back to NEXT_PUBLIC_GOOGLE_PLACES_API_KEY. */
  apiKey?: string | null;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const acRef = React.useRef<google.maps.places.Autocomplete | null>(null);
  const onChangeRef = React.useRef(onChange);
  const onPlaceSelectedRef = React.useRef(onPlaceSelected);
  const resolvedKey = resolveGoogleMapsApiKey(apiKeyProp);
  const [ready, setReady] = React.useState(false);
  const [noKey, setNoKey] = React.useState(!resolvedKey);

  React.useEffect(() => {
    onChangeRef.current = onChange;
    onPlaceSelectedRef.current = onPlaceSelected;
  });

  React.useEffect(() => {
    if (!resolvedKey) {
      setNoKey(true);
      setReady(false);
      return;
    }
    setNoKey(false);
    let cancelled = false;
    loadGoogleMapsApi(apiKeyProp, ["places"])
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setNoKey(true);
          setReady(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [apiKeyProp, resolvedKey]);

  React.useEffect(() => {
    if (!ready || noKey) return;
    let cancelled = false;
    let rafId = 0;
    let attempts = 0;
    const maxAttempts = 180;

    const tryAttach = () => {
      if (cancelled) return;
      const input = inputRef.current;
      const places = window.google?.maps?.places;
      if (!input || !places?.Autocomplete) {
        if (attempts++ < maxAttempts) {
          rafId = requestAnimationFrame(tryAttach);
        }
        return;
      }
      if (acRef.current) return;

      ensurePacContainerAboveModals();

      const opts: google.maps.places.AutocompleteOptions = {
        types: ["address"],
        fields: ["address_components", "formatted_address"],
      };
      if (COUNTRY_RESTRICTION) {
        opts.componentRestrictions = { country: COUNTRY_RESTRICTION };
      }

      const ac = new places.Autocomplete(input, opts);
      acRef.current = ac;
      ac.addListener("place_changed", () => {
        const place = ac.getPlace();
        if (!place.address_components?.length) return;
        const parsed = parseGoogleAddressComponents(place.address_components);
        onChangeRef.current(place.formatted_address ?? parsed.address_line_1);
        onPlaceSelectedRef.current(parsed);
      });
    };

    tryAttach();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      if (acRef.current) {
        window.google?.maps?.event?.clearInstanceListeners(acRef.current);
        acRef.current = null;
      }
    };
  }, [ready, noKey]);

  if (!resolvedKey || noKey) {
    return (
      <Input
        ref={inputRef}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        disabled={disabled}
      />
    );
  }

  return (
    <Input
      ref={inputRef}
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={ready ? placeholder : "Loading..."}
      autoComplete="off"
      disabled={disabled}
    />
  );
}
