/** Stored in Settings → Company as `account_payment_terms_options` (newline, comma, or JSON array). */
export const ACCOUNT_PAYMENT_TERMS_OPTIONS_KEY = "account_payment_terms_options";

export const DEFAULT_ACCOUNT_PAYMENT_TERMS_OPTIONS = [
  "Net 15",
  "Net 30",
  "Net 60",
  "Net 90",
  "Due on receipt",
  "COD",
] as const;

/** Persist as JSON array string for Settings → Payment terms table. */
export function serializeAccountPaymentTermsOptions(terms: string[]): string {
  return JSON.stringify(terms.map((t) => t.trim()).filter(Boolean));
}

export function parseAccountPaymentTermsOptions(raw: string | undefined | null): string[] {
  const s = (raw ?? "").trim();
  if (!s) return [...DEFAULT_ACCOUNT_PAYMENT_TERMS_OPTIONS];
  try {
    const j = JSON.parse(s) as unknown;
    if (Array.isArray(j) && j.every((x) => typeof x === "string"))
      return j.map((x) => x.trim()).filter(Boolean);
  } catch {
    /* use split */
  }
  return s
    .split(/[\n,]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}
