/** Card brand label from PAN digits only (first digits). */
export function cardBrandFromPanDigits(digits: string): string {
  const d = digits.replace(/\D/g, "");
  if (d.startsWith("4")) return "Visa";
  if (/^5[1-5]/.test(d)) return "Mastercard";
  if (/^3[47]/.test(d)) return "Amex";
  if (/^6(?:011|5)/.test(d)) return "Discover";
  if (d.startsWith("6")) return "UnionPay";
  return "Card";
}

export function parseExpMmYy(raw: string): { month: number; year: number } | null {
  const m = raw.trim().replace(/\s/g, "").match(/^(\d{2})\/(\d{2})$/);
  if (!m) return null;
  const month = parseInt(m[1], 10);
  const yy = parseInt(m[2], 10);
  if (month < 1 || month > 12) return null;
  const year = yy < 100 ? 2000 + yy : yy;
  if (year < 2000 || year > 2100) return null;
  return { month, year };
}
