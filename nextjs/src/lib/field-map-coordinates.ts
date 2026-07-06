import { normalizeGanttLongitudeForUsState, parseGanttCoordinate } from "@/lib/gantt-location-address";
import { cityCoordKey, coordsForCity } from "@/lib/marketplace/city-coords";

export type FieldMapLocationStatus = "active" | "upcoming" | "planning" | "on_hold" | "complete";

export type FieldMapCoordinateInput = {
  latitude?: number | string | null;
  longitude?: number | string | null;
  city?: string | null;
  state?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  zipCode?: string | null;
  name?: string | null;
};

function formatGeocodeQuery(input: FieldMapCoordinateInput): string | null {
  const city = input.city?.trim();
  const state = input.state?.trim();
  const line = [city, state, input.zipCode?.trim()].filter(Boolean).join(", ");
  const summary = [input.addressLine1?.trim(), input.addressLine2?.trim(), line]
    .filter(Boolean)
    .join(", ");
  if (!summary) return city && state ? `${city}, ${state}, USA` : null;
  if (state && /^[A-Za-z]{2}$/.test(state) && !/\b(USA|United States)\b/i.test(summary)) {
    return `${summary}, USA`;
  }
  return summary;
}

/** Resolve map position from stored coords, normalized US longitudes, or built-in city lookup. */
export function resolveFieldMapCoordinates(
  input: FieldMapCoordinateInput,
): google.maps.LatLngLiteral | null {
  const lat = parseGanttCoordinate(input.latitude);
  const lng = normalizeGanttLongitudeForUsState(input.state, input.longitude);

  if (lat !== null && lng !== null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
    return { lat, lng };
  }

  const city = input.city?.trim();
  const state = input.state?.trim();
  if (city && state) {
    const fromCity = coordsForCity(city, state);
    if (fromCity) return fromCity;
  }

  return null;
}

export function fieldMapGeocodeQuery(input: FieldMapCoordinateInput): string | null {
  return formatGeocodeQuery(input);
}

export function fieldMapPositionKey(input: Pick<FieldMapCoordinateInput, "city" | "state">): string {
  const city = input.city?.trim() ?? "";
  const state = input.state?.trim() ?? "";
  if (city && state) return cityCoordKey(city, state);
  return "";
}
