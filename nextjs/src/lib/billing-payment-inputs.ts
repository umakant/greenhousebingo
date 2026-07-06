/** Client-side formatting for company billing card fields (display + keystroke limits). */

export type BillingCardBrand = "visa" | "mastercard" | "amex" | "discover" | "unionpay" | "unknown";

export function billingDigitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

export function billingCardBrandFromPan(digits: string): BillingCardBrand {
  const d = billingDigitsOnly(digits);
  if (/^4/.test(d)) return "visa";
  if (/^5[1-5]/.test(d)) return "mastercard";
  if (/^3[47]/.test(d)) return "amex";
  if (/^6(?:011|5)/.test(d)) return "discover";
  if (/^(62|81)/.test(d)) return "unionpay";
  return "unknown";
}

/** Max digits allowed while typing, inferred from the PAN prefix. */
export function billingPanMaxLength(digits: string): number {
  const d = billingDigitsOnly(digits);
  const brand = billingCardBrandFromPan(d);
  switch (brand) {
    case "amex":
      return 15;
    case "unionpay":
      return 19;
    case "visa":
    case "mastercard":
    case "discover":
      return 16;
    default:
      return 16;
  }
}

/** Valid completed PAN lengths for a detected brand. */
export function billingPanValidLengths(digits: string): number[] {
  const brand = billingCardBrandFromPan(digits);
  switch (brand) {
    case "amex":
      return [15];
    case "unionpay":
      return [16, 17, 18, 19];
    case "visa":
      return [13, 16];
    default:
      return [16];
  }
}

export function billingPanIsComplete(digits: string): boolean {
  const d = billingDigitsOnly(digits);
  if (d.length < 13) return false;
  return billingPanValidLengths(d).includes(d.length);
}

/** Luhn checksum (ISO/IEC 7812). */
export function billingLuhnValid(digits: string): boolean {
  const d = billingDigitsOnly(digits);
  if (d.length < 13) return false;
  let sum = 0;
  let alt = false;
  for (let i = d.length - 1; i >= 0; i--) {
    let n = parseInt(d[i]!, 10);
    if (Number.isNaN(n)) return false;
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

export function billingPanIsValidForSave(digits: string): boolean {
  const d = billingDigitsOnly(digits);
  if (!billingPanIsComplete(d)) return false;
  return billingLuhnValid(d);
}

/** Human-readable brand label for the PAN prefix. */
export function billingCardBrandLabel(digits: string): string | null {
  const d = billingDigitsOnly(digits);
  if (d.length < 2) return null;
  switch (billingCardBrandFromPan(d)) {
    case "visa":
      return "Visa";
    case "mastercard":
      return "Mastercard";
    case "amex":
      return "Amex";
    case "discover":
      return "Discover";
    case "unionpay":
      return "UnionPay";
    default:
      return null;
  }
}

/** Groups PAN digits with brand-aware spacing (Amex: 4-6-5; others: groups of 4). */
export function formatBillingCardPanInput(raw: string): string {
  const allDigits = billingDigitsOnly(raw);
  const maxLen = billingPanMaxLength(allDigits);
  const digits = allDigits.slice(0, maxLen);

  if (billingCardBrandFromPan(digits) === "amex") {
    const p1 = digits.slice(0, 4);
    const p2 = digits.slice(4, 10);
    const p3 = digits.slice(10, 15);
    return [p1, p2, p3].filter(Boolean).join(" ");
  }

  const parts: string[] = [];
  for (let i = 0; i < digits.length; i += 4) {
    parts.push(digits.slice(i, i + 4));
  }
  return parts.join(" ");
}

/** Max formatted string length (digits + spaces) for the `<input maxLength>` attribute. */
export function billingFormattedPanMaxLength(digits: string): number {
  const max = billingPanMaxLength(digits);
  if (billingCardBrandFromPan(digits) === "amex") {
    return 17;
  }
  return max + Math.max(0, Math.ceil(max / 4) - 1);
}

/** Builds `MM/YY` from digits only (max 4 digits after strip). */
export function formatBillingExpMmYyInput(raw: string): string {
  const d = billingDigitsOnly(raw).slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
}

/** Amex CVV is 4 digits; other brands use 3. */
export function billingCvvMaxLength(panDigits: string): number {
  const p = panDigits.slice(0, 6);
  return p.startsWith("34") || p.startsWith("37") ? 4 : 3;
}
