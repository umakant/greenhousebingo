"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import { useAppSettings } from "@/contexts/app-settings-context";
import { loadGoogleMapsApi, resolveGoogleMapsApiKey } from "@/lib/google-maps-loader";
import { cn } from "@/lib/utils";

const COUNTRY_RESTRICTION = (() => {
  const raw = process.env.NEXT_PUBLIC_GOOGLE_PLACES_COUNTRY?.trim();
  if (raw === undefined) return "us";
  return raw;
})();

export type CityPlacePick = {
  city: string;
  state: string;
  label: string;
};

function parseCityState(components: google.maps.GeocoderAddressComponent[]): CityPlacePick | null {
  const get = (type: string) => components.find((c) => c.types.includes(type))?.long_name ?? "";
  const getShort = (type: string) => components.find((c) => c.types.includes(type))?.short_name ?? "";

  const city =
    get("locality") ||
    get("sublocality") ||
    get("administrative_area_level_3") ||
    get("administrative_area_level_2");
  const state = getShort("administrative_area_level_1") || get("administrative_area_level_1");

  if (!city && !state) return null;

  const label = city && state ? `${city}, ${state}` : city || state;
  return { city: city || "", state, label };
}

function ensurePacContainerAboveModals() {
  if (typeof document === "undefined") return;
  if (document.querySelector("style[data-pf-city-pac]")) return;
  const style = document.createElement("style");
  style.setAttribute("data-pf-city-pac", "");
  style.textContent =
    ".pac-container{z-index:100000!important;pointer-events:auto!important;}";
  document.head.appendChild(style);
}

/**
 * City / region search with Google Places Autocomplete.
 * Falls back to a plain text input when no API key is configured.
 */
export function CityPlacesSearchInput({
  value,
  onChange,
  onCitySelected,
  placeholder,
  className,
  disabled,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  onCitySelected?: (pick: CityPlacePick) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
}) {
  const { settings } = useAppSettings();
  const apiKey = resolveGoogleMapsApiKey(settings.googleMapsApiKey);

  const inputRef = React.useRef<HTMLInputElement>(null);
  const acRef = React.useRef<google.maps.places.Autocomplete | null>(null);
  const onChangeRef = React.useRef(onChange);
  const onCitySelectedRef = React.useRef(onCitySelected);

  const [ready, setReady] = React.useState(false);
  const [noKey, setNoKey] = React.useState(false);

  React.useEffect(() => {
    onChangeRef.current = onChange;
    onCitySelectedRef.current = onCitySelected;
  });

  React.useEffect(() => {
    if (!apiKey) {
      setNoKey(true);
      return;
    }
    setNoKey(false);

    let cancelled = false;

    loadGoogleMapsApi(settings.googleMapsApiKey, ["places"])
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch(() => {
        if (!cancelled) setNoKey(true);
      });

    return () => {
      cancelled = true;
    };
  }, [apiKey, settings.googleMapsApiKey]);

  React.useEffect(() => {
    if (!ready || noKey) return;

    let cancelled = false;
    let rafId = 0;
    let attempts = 0;

    const tryAttach = () => {
      if (cancelled) return;
      const input = inputRef.current;
      const places = window.google?.maps?.places;
      if (!input || !places?.Autocomplete) {
        if (attempts++ < 180) rafId = requestAnimationFrame(tryAttach);
        return;
      }
      if (acRef.current) return;

      ensurePacContainerAboveModals();

      const opts: google.maps.places.AutocompleteOptions = {
        types: ["(regions)"],
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
        const parsed = parseCityState(place.address_components);
        if (!parsed) {
          const fallback = place.formatted_address ?? "";
          if (fallback) onChangeRef.current(fallback);
          return;
        }
        onChangeRef.current(parsed.label);
        onCitySelectedRef.current?.(parsed);
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

  return (
    <Input
      ref={inputRef}
      id={id}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={noKey ? placeholder : ready ? placeholder : "Loading..."}
      autoComplete="off"
      disabled={disabled}
      className={cn(className)}
    />
  );
}
