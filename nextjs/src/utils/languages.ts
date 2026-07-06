import languages from "@/data/languages.json";

type LanguageRow = { code: string; name: string; countryCode: string; enabled?: boolean };

export function getCountryFlag(countryCode: string): string {
  const codePoints = (countryCode || "GB")
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  return String.fromCodePoint(...codePoints);
}

export const availableLanguages = (languages as LanguageRow[])
  .filter((l) => l.enabled !== false)
  .map((l) => ({ ...l, flag: getCountryFlag(l.countryCode) }));

