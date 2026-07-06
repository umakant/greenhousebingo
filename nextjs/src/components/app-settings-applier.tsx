"use client";

import * as React from "react";
import { useAppSettings } from "@/contexts/app-settings-context";
import {
  applyBrandThemeToDocument,
  BRAND_THEME_CSS_CACHE_KEY,
  buildBrandThemeCssCache,
} from "@/lib/brand-theme";
import { setBrandThemeSettingsSnapshot } from "@/lib/brand-theme-sync";
import { isHtmlDark } from "@/lib/theme-mode";
import { getImagePath } from "@/utils/image-path";

function ensureFavicon(url: string) {
  const href = getImagePath(url);
  if (!href) return;

  const head = document.head;
  const existing =
    (head.querySelector("link[rel='icon']") as HTMLLinkElement | null) ??
    (head.querySelector("link[rel='shortcut icon']") as HTMLLinkElement | null);

  if (existing) {
    existing.href = href;
    return;
  }

  const link = document.createElement("link");
  link.rel = "icon";
  link.href = href;
  head.appendChild(link);
}

export default function AppSettingsApplier() {
  const { settings } = useAppSettings();

  React.useEffect(() => {
    const titleText =
      (settings.titleText ?? "").trim() ||
      (settings.company_name ?? "").trim() ||
      "SecurX";
    document.title = titleText;

    const favicon =
      (settings.favicon ?? "").trim() ||
      (settings.logo_icon ?? "").trim() ||
      (settings.logo_light ?? "").trim() ||
      (settings.logo_dark ?? "").trim();
    if (favicon) ensureFavicon(favicon);
  }, [settings]);

  const applyBrand = React.useCallback(() => {
    if (!("themeColor" in settings) && !("customColor" in settings)) return;
    setBrandThemeSettingsSnapshot(settings);
    applyBrandThemeToDocument(settings, isHtmlDark());
    try {
      localStorage.setItem(BRAND_THEME_CSS_CACHE_KEY, JSON.stringify(buildBrandThemeCssCache(settings)));
    } catch {
      /* ignore quota / private mode */
    }
  }, [settings]);

  /** Keep inline `--sidebar-*` (and primary) in sync with the real `dark` class — not React state, which can lag behind DOM updates from the theme control. */
  React.useLayoutEffect(() => {
    applyBrand();
    const root = document.documentElement;
    const obs = new MutationObserver(() => applyBrand());
    obs.observe(root, { attributes: true, attributeFilter: ["class", "data-theme"] });
    return () => obs.disconnect();
  }, [applyBrand]);

  return null;
}

