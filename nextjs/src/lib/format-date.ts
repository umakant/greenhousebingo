/**
 * Format a date using PHP-style date format strings stored in Settings > System.
 * Supported format tokens: Y, y, m, n, d, j, H, h, G, g, i, s, A, a
 *
 * Common setting values:
 *   "Y-m-d"  → 2024-01-15
 *   "d-m-Y"  → 15-01-2024
 *   "m/d/Y"  → 01/15/2024
 *   "d/m/Y"  → 15/01/2024
 *   "D, d M Y" → Mon, 15 Jan 2024
 */

const SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const LONG_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const LONG_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function phpDateFormat(date: Date, format: string): string {
  const Y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const H = date.getHours();
  const i = date.getMinutes();
  const s = date.getSeconds();
  const w = date.getDay();
  const h12 = H % 12 === 0 ? 12 : H % 12;

  let result = "";
  for (let idx = 0; idx < format.length; idx++) {
    const ch = format[idx];
    switch (ch) {
      case "Y": result += Y; break;
      case "y": result += String(Y).slice(-2); break;
      case "m": result += pad2(m); break;
      case "n": result += m; break;
      case "d": result += pad2(d); break;
      case "j": result += d; break;
      case "D": result += SHORT_DAYS[w]; break;
      case "l": result += LONG_DAYS[w]; break;
      case "M": result += SHORT_MONTHS[date.getMonth()]; break;
      case "F": result += LONG_MONTHS[date.getMonth()]; break;
      case "H": result += pad2(H); break;
      case "G": result += H; break;
      case "h": result += pad2(h12); break;
      case "g": result += h12; break;
      case "i": result += pad2(i); break;
      case "s": result += pad2(s); break;
      case "A": result += H >= 12 ? "PM" : "AM"; break;
      case "a": result += H >= 12 ? "pm" : "am"; break;
      case "\\": idx++; result += format[idx] ?? ""; break;
      default: result += ch;
    }
  }
  return result;
}

export type DateSettings = {
  dateFormat?: string;
  timeFormat?: string;
  defaultTimezone?: string;
};

const DEFAULT_DATE_FORMAT = "Y-m-d";

/** US-style default when settings use invalid / Moment-style patterns. */
export const US_DATE_FORMAT_PHP = "m/d/Y";

/**
 * Converts Moment/dayjs-style date format strings to PHP `date()` tokens.
 * Settings seeded as `DD MMM, YYYY` were misread character-by-character (e.g. ThuThu MarMarMar).
 */
/** Legacy / mistaken Moment-style values stored before PHP-token normalization. */
const LEGACY_DATE_FORMAT_ALIASES: Record<string, string> = {
  "DD MMM, YYYY": US_DATE_FORMAT_PHP,
  "DD MMM YYYY": US_DATE_FORMAT_PHP,
  "ddd, MMM DD, YYYY": US_DATE_FORMAT_PHP,
  "MM/DD/YYYY": US_DATE_FORMAT_PHP,
};

export function normalizeDateFormatToPhp(format: string): string {
  let s = format.trim();
  if (!s) return DEFAULT_DATE_FORMAT;

  const legacy = LEGACY_DATE_FORMAT_ALIASES[s];
  if (legacy) return legacy;

  const replacements: [string, string][] = [
    ["YYYY", "Y"],
    ["yyyy", "Y"],
    ["YY", "y"],
    ["yy", "y"],
    ["MMMM", "F"],
    ["MMM", "M"],
    ["MM", "m"],
    ["DDDD", "l"],
    ["dddd", "l"],
    ["DDD", "D"],
    ["ddd", "D"],
    ["DD", "d"],
    ["dd", "d"],
  ];

  for (const [from, to] of replacements) {
    s = s.split(from).join(to);
  }

  return s;
}

/** Format a start/end date pair for list cards (avoids broken legacy format strings). */
export function formatDateRange(
  start: string | Date | number | null | undefined,
  end: string | Date | number | null | undefined,
  settings: DateSettings | Record<string, string> = {},
  fallback = "—",
): string {
  const a = formatDate(start, settings, "");
  const b = formatDate(end, settings, "");
  if (a && b) return `${a} - ${b}`;
  if (a) return a;
  if (b) return b;
  return fallback;
}

/** Local calendar date as YYYY-MM-DD (for APIs and controlled inputs). */
export function toIsoDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** True when the calendar date is strictly before today (local timezone). */
export function isDateBeforeToday(value: string | Date | number | null | undefined): boolean {
  const d = parseDate(value);
  if (!d) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cmp = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return cmp.getTime() < today.getTime();
}

export function parseDate(value: string | Date | number | null | undefined): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === "number") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  const str = String(value).trim();
  if (!str) return null;
  // Date-only (YYYY-MM-DD) — parse as local to avoid UTC-midnight shift
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, mo, dy] = str.split("-").map(Number);
    const d = new Date(y, (mo ?? 1) - 1, dy ?? 1);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Format a date value using the application's date format setting.
 * Falls back to "YYYY-MM-DD" when settings are absent.
 *
 * @param value   Date, ISO string, date-only string, or timestamp.
 * @param settings   Object with at least `dateFormat` from app settings.
 * @param fallback   String to return for null/invalid dates (default "—").
 */
export function formatDate(
  value: string | Date | number | null | undefined,
  settings: DateSettings | Record<string, string> = {},
  fallback = "—",
): string {
  const date = parseDate(value);
  if (!date) return fallback;
  const raw = (settings as DateSettings).dateFormat?.trim() || DEFAULT_DATE_FORMAT;
  const fmt = normalizeDateFormatToPhp(raw);
  return phpDateFormat(date, fmt);
}

/**
 * Format a date+time value using dateFormat + timeFormat settings.
 *
 * @param value   Date, ISO string, or timestamp.
 * @param settings   Object with `dateFormat` and `timeFormat` from app settings.
 * @param fallback   String to return for null/invalid (default "—").
 */
export function formatDateTime(
  value: string | Date | number | null | undefined,
  settings: DateSettings | Record<string, string> = {},
  fallback = "—",
): string {
  const date = parseDate(value);
  if (!date) return fallback;
  const dateFmt = normalizeDateFormatToPhp(
    (settings as DateSettings).dateFormat?.trim() || DEFAULT_DATE_FORMAT,
  );
  const timeFmt12 = (settings as DateSettings).timeFormat === "24" ? "H:i" : "h:i A";
  return `${phpDateFormat(date, dateFmt)} ${phpDateFormat(date, timeFmt12)}`;
}
