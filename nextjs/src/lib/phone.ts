/**
 * Project-wide US phone formatting: (000) 000-0000 (10 digits).
 * Use `formatPhone` / `unformatPhone` in inputs; `formatPhoneDisplay` for tables and read-only UI.
 * Strips a leading country digit 1 when there are 11 digits (e.g. +1…).
 */
export function formatPhone(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.length >= 11 && digits.startsWith("1")) {
    digits = digits.slice(1);
  }
  digits = digits.slice(0, 10);
  if (!digits.length) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/** @deprecated Use `formatPhone` — Event Platform legacy alias. */
export function formatPhoneExtended(raw: string): string {
  return formatPhone(raw);
}

export function unformatPhone(value: string): string {
  return value.replace(/\D/g, "");
}

/** Value to persist (formatted US number, or trimmed raw for international / partial). */
export function normalizeMobileForStorage(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let d = unformatPhone(trimmed);
  if (d.length >= 11 && d.startsWith("1")) d = d.slice(1);
  if (d.length > 0 && d.length <= 10) return formatPhone(d) || null;
  return trimmed;
}

/**
 * Read-only display for tables/lists (same shape as companies list).
 * @param empty - placeholder when value is blank (e.g. "-" for tables).
 */
export function formatPhoneDisplay(value: string | null | undefined, empty = ""): string {
  if (!value || !String(value).trim()) return empty;
  const digits = String(value).replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length > 10) {
    const last10 = digits.slice(-10);
    const countryCode = digits.slice(0, digits.length - 10);
    return `+${countryCode} (${last10.slice(0, 3)}) ${last10.slice(3, 6)}-${last10.slice(6)}`;
  }
  if (digits.length > 0) {
    return formatPhone(value);
  }
  return String(value).trim();
}

/** @deprecated Use `formatPhoneDisplay` — Event Platform legacy alias. */
export function formatPhoneExtendedDisplay(value: string | null | undefined, empty = ""): string {
  return formatPhoneDisplay(value, empty);
}

