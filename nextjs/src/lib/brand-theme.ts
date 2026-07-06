/**
 * Maps saved brand settings to CSS variables used by the app shell (shadcn / Tailwind).
 * Keeps the same preset hex values as `ThemePreview` in settings.
 */

const THEME_COLOR_HEX: Record<string, string> = {
  blue: "#3b82f6",
  green: "#10b981",
  purple: "#8b5cf6",
  orange: "#f97316",
  red: "#ef4444",
};

/** HSL components as "H S% L%" for `hsl(var(--token))` (no `hsl()` wrapper). */
function hexToHslComponents(hex: string): string {
  const raw = hex.replace(/^#/, "").trim();
  if (raw.length !== 6) return "217.2 91.2% 59.8%";
  const r = parseInt(raw.slice(0, 2), 16) / 255;
  const g = parseInt(raw.slice(2, 4), 16) / 255;
  const b = parseInt(raw.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      default:
        h = ((r - g) / d + 4) / 6;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function parseHslComponents(hsl: string): { h: number; s: number; l: number } {
  const parts = hsl.trim().split(/\s+/);
  const h = parseFloat(parts[0] ?? "0");
  const s = parseFloat((parts[1] ?? "0").replace("%", ""));
  const l = parseFloat((parts[2] ?? "0").replace("%", ""));
  return { h, s, l };
}

function formatHslComponents(h: number, s: number, l: number): string {
  return `${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%`;
}

/** Slightly darker sidebar accent for hover on colored / gradient sidebars. */
function accentFromPrimary(primaryHsl: string): string {
  const { h, s, l } = parseHslComponents(primaryHsl);
  return formatHslComponents(h, Math.min(100, s + 5), Math.max(0, l - 12));
}

export function resolveBrandPrimaryHex(themeColor: string, customColor: string): string {
  if (themeColor === "custom") {
    const c = (customColor || "").trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(c)) return c;
    return "#10b981";
  }
  return THEME_COLOR_HEX[themeColor] ?? THEME_COLOR_HEX.green ?? "#10b981";
}

/** Light theme defaults from `globals.css` (plain sidebar). */
const LIGHT_SIDEBAR_PLAIN: Record<string, string> = {
  "--sidebar-background": "0 0% 98%",
  "--sidebar-foreground": "240 5.3% 26.1%",
  "--sidebar-accent": "240 4.8% 95.9%",
  "--sidebar-accent-foreground": "240 5.9% 10%",
  "--sidebar-border": "220 13% 91%",
};

/** Dark theme defaults from `globals.css` (plain sidebar). */
const DARK_SIDEBAR_PLAIN: Record<string, string> = {
  "--sidebar-background": "234 28% 17%",
  "--sidebar-foreground": "240 4.8% 95.9%",
  "--sidebar-accent": "234 22% 28%",
  "--sidebar-accent-foreground": "240 4.8% 95.9%",
  "--sidebar-border": "234 20% 30%",
};

export type BrandThemeSettings = Record<string, string | undefined>;

export const BRAND_THEME_CSS_CACHE_KEY = "pf_brand_theme_css";
export const BRAND_BOOT_SERVER_STYLE_ID = "pf-brand-boot-server";

/** CSS custom properties for brand + sidebar tokens (no `dir`; set separately on `<html>`). */
export function collectBrandThemeCssVars(settings: BrandThemeSettings, isDark: boolean): Record<string, string> {
  const themeColor = (settings.themeColor ?? "green").trim();
  const customColor = (settings.customColor ?? "#10b981").trim();
  const primaryHex = resolveBrandPrimaryHex(themeColor, customColor);
  const primaryHsl = hexToHslComponents(primaryHex);

  const vars: Record<string, string> = {
    "--primary": primaryHsl,
    "--primary-foreground": "0 0% 100%",
    "--ring": primaryHsl,
    "--sidebar-primary": primaryHsl,
    "--sidebar-primary-foreground": "0 0% 100%",
    "--sidebar-ring": primaryHsl,
  };

  const sidebarStyle = (settings.sidebarStyle ?? "plain").trim();
  const plain = isDark ? DARK_SIDEBAR_PLAIN : LIGHT_SIDEBAR_PLAIN;
  if (sidebarStyle === "plain") {
    Object.assign(vars, plain);
    vars["--sidebar-primary"] = primaryHsl;
    vars["--sidebar-ring"] = primaryHsl;
  } else if (sidebarStyle === "colored" || sidebarStyle === "gradient") {
    vars["--sidebar-background"] = primaryHsl;
    vars["--sidebar-foreground"] = "0 0% 98%";
    vars["--sidebar-accent"] = accentFromPrimary(primaryHsl);
    vars["--sidebar-accent-foreground"] = "0 0% 100%";
    vars["--sidebar-border"] = accentFromPrimary(primaryHsl);
  }

  return vars;
}

export function resolveBrandLayoutDirection(settings: BrandThemeSettings): "ltr" | "rtl" {
  return (settings.layoutDirection ?? "ltr").trim() === "rtl" ? "rtl" : "ltr";
}

function cssVarsBlock(selector: string, vars: Record<string, string>): string {
  const body = Object.entries(vars)
    .map(([k, v]) => `${k}:${v}`)
    .join(";");
  return `${selector}{${body}}`;
}

/** Inline `<style>` block for SSR first paint (`:root` + `.dark`). */
export function buildBrandThemeStyleBlock(settings: BrandThemeSettings): string {
  const lightVars = collectBrandThemeCssVars(settings, false);
  const darkVars = collectBrandThemeCssVars(settings, true);
  const dir = resolveBrandLayoutDirection(settings);
  return `${cssVarsBlock(":root", lightVars)}${cssVarsBlock(".dark", darkVars)}html{direction:${dir}}`;
}

export type BrandThemeCssCache = {
  light: Record<string, string>;
  dark: Record<string, string>;
  dir: "ltr" | "rtl";
};

export function buildBrandThemeCssCache(settings: BrandThemeSettings): BrandThemeCssCache {
  return {
    light: collectBrandThemeCssVars(settings, false),
    dark: collectBrandThemeCssVars(settings, true),
    dir: resolveBrandLayoutDirection(settings),
  };
}

/** Blocking boot script: applies cached CSS vars before React hydrates (skipped when SSR style is present). */
export function buildBrandThemeBootScript(): string {
  return `(() => {
  try {
    if (document.getElementById("${BRAND_BOOT_SERVER_STYLE_ID}")) return;
    var raw = localStorage.getItem("${BRAND_THEME_CSS_CACHE_KEY}");
    if (!raw) return;
    var cache = JSON.parse(raw);
    if (!cache || typeof cache !== "object") return;
    var isDark = document.documentElement.classList.contains("dark");
    var vars = isDark ? cache.dark : cache.light;
    if (!vars || typeof vars !== "object") return;
    var root = document.documentElement;
    for (var k in vars) {
      if (Object.prototype.hasOwnProperty.call(vars, k)) root.style.setProperty(k, vars[k]);
    }
    if (cache.dir === "rtl" || cache.dir === "ltr") root.setAttribute("dir", cache.dir);
  } catch {}
})();`;
}

/**
 * Applies brand colors and layout direction to `document.documentElement`.
 * Call from a client component when `AppSettings` values change.
 */
export function applyBrandThemeToDocument(settings: BrandThemeSettings, isDark: boolean): void {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const vars = collectBrandThemeCssVars(settings, isDark);
  for (const [k, v] of Object.entries(vars)) {
    root.style.setProperty(k, v);
  }
  root.setAttribute("dir", resolveBrandLayoutDirection(settings));
}
