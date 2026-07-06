import { applyBrandThemeToDocument, type BrandThemeSettings } from "@/lib/brand-theme";

let settingsSnapshot: BrandThemeSettings | null = null;

/** Called from `AppSettingsApplier` whenever brand settings are applied so theme toggles can re-run the same mapping. */
export function setBrandThemeSettingsSnapshot(settings: BrandThemeSettings) {
  settingsSnapshot = settings;
}

/**
 * Re-applies sidebar/primary tokens for the current `html.dark` state.
 * Must run in the same turn as `applyThemeToDocument` so `--sidebar-*` inline vars never
 * stay on dark-scheme values after switching to light (which would wash out nav links).
 */
export function syncBrandThemeWithDocumentTheme() {
  if (typeof document === "undefined") return;
  // Keep SSR / boot-script / localStorage brand vars until AppSettingsApplier loads real settings.
  if (!settingsSnapshot) return;
  const isDark = document.documentElement.classList.contains("dark");
  applyBrandThemeToDocument(settingsSnapshot, isDark);
}
