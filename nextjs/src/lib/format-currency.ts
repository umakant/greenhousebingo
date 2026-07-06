/**
 * Format a number as currency using Settings > Currency.
 * Uses: defaultCurrency, decimalFormat, decimalSeparator, thousandsSeparator,
 * currencySymbolPosition, currencySymbolSpace, currencySymbol.
 */

export type CurrencySettings = {
  defaultCurrency?: string;
  decimalFormat?: string;
  decimalSeparator?: string;
  thousandsSeparator?: string;
  floatNumber?: string;
  currencySymbolSpace?: string;
  currencySymbolPosition?: string;
  currencySymbol?: string;
};

const defaults: CurrencySettings = {
  decimalFormat: "2",
  decimalSeparator: ".",
  thousandsSeparator: ",",
  currencySymbolPosition: "before",
  currencySymbolSpace: "1",
  currencySymbol: "$",
};

/** Map stored values (left/right/before/after) to before | after. */
export function normalizeCurrencySymbolPosition(raw: string | undefined | null): "before" | "after" {
  const p = String(raw ?? "before").trim().toLowerCase();
  if (p === "after" || p === "right") return "after";
  return "before";
}

/** Default true unless explicitly disabled. */
export function normalizeCurrencySymbolSpace(raw: string | undefined | null): boolean {
  const v = String(raw ?? "1").trim().toLowerCase();
  if (v === "0" || v === "off" || v === "false") return false;
  return true;
}

/**
 * Format a numeric value as currency per Settings > Currency.
 * @param value - Amount (number or string)
 * @param settings - From useAppSettings().settings or any Record with currency keys
 */
export function formatCurrency(value: number | string, settings: CurrencySettings | Record<string, string> = {}): string {
  const s = { ...defaults, ...settings };
  const num = typeof value === "string" ? parseFloat(value) : Number(value);
  const symbol = (String(s.currencySymbol ?? "").trim() || "$");
  if (!Number.isFinite(num)) return `${symbol}0.00`;

  const decimals = Math.min(10, Math.max(0, parseInt(String(s.decimalFormat ?? "2").trim() || "2", 10) || 2));
  const showDecimals = s.floatNumber !== "0" && s.floatNumber !== "off";
  const fixed = showDecimals ? num.toFixed(decimals) : String(Math.round(num));
  const parts = fixed.split(".");
  const intPart = parts[0] ?? "0";
  const decPart = parts[1] ?? "";

  let intFormatted = intPart;
  const thousandsSep = (s.thousandsSeparator === "none" || !String(s.thousandsSeparator ?? "").trim()) ? "" : (String(s.thousandsSeparator ?? ",").trim() || ",");
  if (thousandsSep) {
    intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSep);
  }
  const decimalSep = String(s.decimalSeparator ?? ".").trim() || ".";
  const numberStr = decPart ? `${intFormatted}${decimalSep}${decPart}` : intFormatted;
  const space = normalizeCurrencySymbolSpace(s.currencySymbolSpace) ? " " : "";

  const position = normalizeCurrencySymbolPosition(s.currencySymbolPosition);
  const symbolAfter = position === "after";
  if (symbolAfter) {
    return `${numberStr}${space}${symbol}`;
  }
  return `${symbol}${space}${numberStr}`;
}

/**
 * Parse a user-entered amount (plain or formatted per Settings > Currency) to a number.
 * Inverse of {@link formatCurrency} for typical inputs.
 */
export function parseCurrencyToNumber(
  input: string,
  settings: CurrencySettings | Record<string, string> = {},
): number {
  const s = { ...defaults, ...settings };
  let t = String(input ?? "").trim();
  if (!t) return NaN;

  const symbol = String(s.currencySymbol ?? "").trim();
  if (symbol) {
    if (t.startsWith(symbol)) t = t.slice(symbol.length).trimStart();
    else if (t.endsWith(symbol)) t = t.slice(0, -symbol.length).trimEnd();
  }
  t = t.replace(/\s/g, "");

  const showDecimals = s.floatNumber !== "0" && s.floatNumber !== "off";
  const decimalSep = String(s.decimalSeparator ?? ".").trim() || ".";
  const thousandsSep =
    s.thousandsSeparator === "none" || !String(s.thousandsSeparator ?? "").trim()
      ? ""
      : String(s.thousandsSeparator).trim();

  if (!showDecimals) {
    const flattened = thousandsSep ? t.split(thousandsSep).join("") : t;
    const n = parseFloat(flattened.replace(/[^\d-]/g, "") || "");
    return Number.isFinite(n) ? n : NaN;
  }

  const lastDec = t.lastIndexOf(decimalSep);
  if (lastDec === -1) {
    const flattened = thousandsSep ? t.split(thousandsSep).join("") : t;
    const n = parseFloat(flattened.replace(/[^\d-]/g, "") || "");
    return Number.isFinite(n) ? n : NaN;
  }

  const intRaw = t.slice(0, lastDec);
  const decRaw = t.slice(lastDec + decimalSep.length);
  const intPart = thousandsSep ? intRaw.split(thousandsSep).join("") : intRaw;
  const intDigits = intPart.replace(/[^\d-]/g, "");
  const decDigits = decRaw.replace(/[^\d]/g, "");
  const normalized = decDigits.length > 0 ? `${intDigits}.${decDigits}` : intDigits;
  const n = parseFloat(normalized || "");
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Restrict typed input to digits and at most one decimal point, with up to `maxDecimals` fractional digits.
 * Returns a plain string using `.` as decimal (use {@link formatCurrency} on blur for symbols / thousands).
 */
export function filterMoneyDecimalInput(raw: string, maxDecimals = 2): string {
  let s = String(raw ?? "").replace(/[^\d.]/g, "");
  const dot = s.indexOf(".");
  if (dot === -1) return s;
  const intPart = s.slice(0, dot);
  const frac = s.slice(dot + 1).replace(/\./g, "").slice(0, maxDecimals);
  return frac.length > 0 || s.slice(-1) === "." ? `${intPart}.${frac}` : intPart;
}
