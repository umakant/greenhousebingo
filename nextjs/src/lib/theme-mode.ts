/**
 * Light / dark / system theme for the admin portal (`pf_theme` in localStorage).
 * Keep the inline boot script in `app/layout.tsx` aligned with getEffectiveColorScheme().
 */

import { syncBrandThemeWithDocumentTheme } from "@/lib/brand-theme-sync";

export const PF_THEME_STORAGE_KEY = "pf_theme";

export type ThemeMode = "light" | "dark" | "system";

export function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "dark" : "light";
}

export function getStoredThemeMode(): ThemeMode {
  if (typeof window === "undefined") return "system";
  const raw = localStorage.getItem(PF_THEME_STORAGE_KEY) as ThemeMode | null;
  if (raw === "light" || raw === "dark" || raw === "system") return raw;
  return "system";
}

/** Resolved scheme used for `dark` class and UI (system → OS preference). */
export function getEffectiveColorScheme(mode: ThemeMode): "light" | "dark" {
  return mode === "system" ? getSystemTheme() : mode;
}

/** Matches app dark `--background` (234 28% 18%) for mobile browser chrome. */
const THEME_COLOR_DARK = "#1a1d2e";
const THEME_COLOR_LIGHT = "#ffffff";

function updateThemeColorMeta(effective: "light" | "dark") {
  if (typeof document === "undefined") return;
  let el = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", "theme-color");
    document.head.appendChild(el);
  }
  el.setAttribute("content", effective === "dark" ? THEME_COLOR_DARK : THEME_COLOR_LIGHT);
}

/**
 * Sets `dark` on `<html>`, `data-theme` to the resolved scheme, and `theme-color` meta.
 * Immediately re-syncs inline `--sidebar-*` / brand tokens so they match the new scheme
 * (MutationObserver alone can lag one frame and leave stale light-on-light sidebar text).
 */
export function applyThemeToDocument(mode: ThemeMode): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const effective = getEffectiveColorScheme(mode);
  root.classList.toggle("dark", effective === "dark");
  root.dataset.theme = effective;
  updateThemeColorMeta(effective);
  syncBrandThemeWithDocumentTheme();
}

/** Whether `<html>` currently has the `dark` class (after boot script or `applyThemeToDocument`). */
export function isHtmlDark(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}
