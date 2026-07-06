export type LanguageRow = { code: string; name: string; countryCode: string; enabled?: boolean };

export const LANGUAGE_CATALOG_SETTING_KEY = "language_catalog" as const;
export const DEFAULT_ENABLED_LANGUAGE_CODE = "en" as const;

export function isDefaultEnabledLanguage(code: string): boolean {
  return code.trim().toLowerCase() === DEFAULT_ENABLED_LANGUAGE_CODE;
}

export function resolveLanguageEnabled(raw: unknown, code: string): boolean {
  if (raw === false || raw === "0" || raw === 0) return false;
  if (raw === true || raw === "1" || raw === 1) return true;
  return isDefaultEnabledLanguage(code);
}

export function normalizeLanguageCode(code: string): string {
  return code.trim().toLowerCase();
}

/** Map catalog codes to translation locale keys (e.g. pt-br → pt-BR). */
export function catalogCodeToLocale(code: string): string {
  const normalized = normalizeLanguageCode(code);
  if (normalized === "pt-br") return "pt-BR";
  return normalized;
}

export function languageCodesMatch(a: string, b: string): boolean {
  return normalizeLanguageCode(a) === normalizeLanguageCode(b);
}

export function getEnabledLanguageRows(rows: LanguageRow[]): LanguageRow[] {
  return rows.filter((l) => l.enabled !== false);
}

export function parseLanguageCatalogJson(raw: string | undefined | null): LanguageRow[] | null {
  const t = (raw ?? "").trim();
  if (!t) return null;
  try {
    const parsed = JSON.parse(t) as unknown;
    if (!Array.isArray(parsed)) return null;
    const rows: LanguageRow[] = [];
    for (const el of parsed) {
      if (!el || typeof el !== "object") continue;
      const o = el as Record<string, unknown>;
      const code = normalizeLanguageCode(String(o.code ?? ""));
      const name = String(o.name ?? "").trim();
      const countryCode = String(o.countryCode ?? o.country_code ?? "")
        .trim()
        .toUpperCase();
      if (!code || !name || !/^[A-Z]{2}$/.test(countryCode)) continue;
      rows.push({ code, name, countryCode, enabled: resolveLanguageEnabled(o.enabled, code) });
    }
    return rows.length > 0 ? rows : null;
  } catch {
    return null;
  }
}
