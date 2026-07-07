"use client";

import * as React from "react";

import {
  loadGoogleMaps,
  parseGoogleAddressComponents,
  type GoogleAddressParsed,
} from "@/components/account/google-address-input";

const GMAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY ?? "";

const COUNTRY_RESTRICTION = (() => {
  const raw = process.env.NEXT_PUBLIC_GOOGLE_PLACES_COUNTRY?.trim();
  if (raw === undefined) return "us";
  return raw;
})();

export type GoogleBusinessResult = {
  name: string;
  phone: string;
  formattedAddress: string;
  address: GoogleAddressParsed | null;
  latitude: number | null;
  longitude: number | null;
};

function ensurePacContainerOnTop() {
  if (document.querySelector("style[data-pf-pac-z-index]")) return;
  const style = document.createElement("style");
  style.setAttribute("data-pf-pac-z-index", "1");
  style.textContent = ".pac-container{z-index:100000!important;pointer-events:auto!important;}";
  document.head.appendChild(style);
}

/**
 * Google Places Autocomplete for businesses (establishments). On select it returns the business
 * name, phone, and parsed address. Falls back to a plain text input when no API key is configured.
 * Renders a native <input> so callers can apply their own classes (e.g. `.ck-input`).
 */
export function GoogleBusinessInput({
  value,
  onChange,
  onBusinessSelected,
  placeholder,
  id,
  className,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onBusinessSelected: (result: GoogleBusinessResult) => void;
  placeholder?: string;
  id?: string;
  className?: string;
  disabled?: boolean;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const acRef = React.useRef<google.maps.places.Autocomplete | null>(null);
  const onChangeRef = React.useRef(onChange);
  const onSelectedRef = React.useRef(onBusinessSelected);

  React.useEffect(() => {
    onChangeRef.current = onChange;
    onSelectedRef.current = onBusinessSelected;
  });

  React.useEffect(() => {
    if (!GMAPS_API_KEY) return;
    let cancelled = false;
    let rafId = 0;
    let attempts = 0;
    const maxAttempts = 180;

    const tryAttach = () => {
      if (cancelled) return;
      const input = inputRef.current;
      const places = window.google?.maps?.places;
      if (!input || !places?.Autocomplete) {
        if (attempts++ < maxAttempts) rafId = requestAnimationFrame(tryAttach);
        return;
      }
      if (acRef.current) return;

      ensurePacContainerOnTop();

      const opts: google.maps.places.AutocompleteOptions = {
        types: ["establishment"],
        fields: [
          "name",
          "formatted_address",
          "address_components",
          "formatted_phone_number",
          "international_phone_number",
          "geometry.location",
        ],
      };
      if (COUNTRY_RESTRICTION) {
        opts.componentRestrictions = { country: COUNTRY_RESTRICTION };
      }

      const ac = new places.Autocomplete(input, opts);
      acRef.current = ac;
      ac.addListener("place_changed", () => {
        const place = ac.getPlace();
        const name = place.name ?? "";
        const address = place.address_components?.length
          ? parseGoogleAddressComponents(place.address_components)
          : null;
        const phone = place.formatted_phone_number ?? place.international_phone_number ?? "";
        const loc = place.geometry?.location;
        let latitude: number | null = null;
        let longitude: number | null = null;
        if (loc && typeof loc.lat === "function" && typeof loc.lng === "function") {
          try {
            latitude = loc.lat();
            longitude = loc.lng();
          } catch {
            latitude = null;
            longitude = null;
          }
        }
        if (name) onChangeRef.current(name);
        onSelectedRef.current({
          name,
          phone,
          formattedAddress: place.formatted_address ?? "",
          address,
          latitude,
          longitude,
        });
      });
    };

    loadGoogleMaps()
      .then(() => {
        if (!cancelled) tryAttach();
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      if (acRef.current) {
        window.google?.maps?.event?.clearInstanceListeners(acRef.current);
        acRef.current = null;
      }
    };
  }, []);

  return (
    <input
      ref={inputRef}
      id={id}
      className={className}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoComplete={GMAPS_API_KEY ? "off" : "organization"}
      disabled={disabled}
    />
  );
}
