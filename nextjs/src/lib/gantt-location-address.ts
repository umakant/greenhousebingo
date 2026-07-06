/** Parse optional coordinate from form/API string. */
export function parseGanttCoordinate(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : parseFloat(String(value).trim());
  if (!Number.isFinite(n)) return null;
  return n;
}

export type GanttLocationMapAddress = {
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
};

/** US states/territories use western hemisphere longitudes — fix missing minus sign. */
export function normalizeGanttLongitudeForUsState(state: string | null | undefined, longitude: unknown): number | null {
  const lng = parseGanttCoordinate(longitude);
  if (lng === null) return null;
  const st = (state ?? "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(st)) return lng;
  if (lng > 0) return -Math.abs(lng);
  return lng;
}

function formatGanttAddressQuery(addr: GanttLocationMapAddress): string {
  const line = [addr.city, addr.state, addr.zipCode].filter(Boolean).join(", ");
  let summary = [addr.addressLine1, addr.addressLine2, line].filter(Boolean).join(", ");
  const st = (addr.state ?? "").trim();
  if (summary && /^[A-Za-z]{2}$/.test(st) && !/\b(USA|United States)\b/i.test(summary)) {
    summary = `${summary}, USA`;
  }
  return summary;
}

/** Prefer a complete street address for embed geocoding; stale lat/lng must not override manual edits. */
export function buildGanttLocationMapQuery(
  latitude: string,
  longitude: string,
  addr: GanttLocationMapAddress,
): string | null {
  const hasCompleteAddress = Boolean(
    addr.addressLine1?.trim() && addr.city?.trim() && addr.state?.trim(),
  );
  const addressQuery = formatGanttAddressQuery(addr);

  if (hasCompleteAddress && addressQuery) return addressQuery;

  const lat = parseGanttCoordinate(latitude);
  const lng = normalizeGanttLongitudeForUsState(addr.state, longitude);
  if (lat !== null && lng !== null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
    return `${lat},${lng}`;
  }

  return addressQuery || null;
}

function trimOrNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed || null;
}

export type GanttLocationAddressInput = {
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  latitude?: unknown;
  longitude?: unknown;
};

export function buildGanttLocationAddressData(body: GanttLocationAddressInput) {
  const data: {
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    state?: string | null;
    zipCode?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  } = {};

  if (body.addressLine1 !== undefined) {
    data.addressLine1 = trimOrNull(body.addressLine1);
  }
  if (body.addressLine2 !== undefined) {
    data.addressLine2 = trimOrNull(body.addressLine2);
  }
  if (body.city !== undefined) {
    data.city = trimOrNull(body.city);
  }
  if (body.state !== undefined) {
    data.state = trimOrNull(body.state);
  }
  if (body.zipCode !== undefined) {
    data.zipCode = trimOrNull(body.zipCode);
  }
  if (body.latitude !== undefined) {
    data.latitude = parseGanttCoordinate(body.latitude);
  }
  if (body.longitude !== undefined) {
    data.longitude = normalizeGanttLongitudeForUsState(body.state, body.longitude);
  }

  return data;
}
