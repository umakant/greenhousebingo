import fs from "fs/promises";
import path from "path";

import StreamZip from "node-stream-zip";

/**
 * Converts #RRGGBB to Tailwind-style HSL components (`H S% L%`) used in `globals.css` / shadcn themes.
 */
export function hexToHslTriplet(hexRaw: string): string | null {
  const hex = hexRaw.trim();
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex);
  if (!m) return null;
  let h = m[1]!.toLowerCase();
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const l = (max + min) / 2;
  let s = 0;
  let hue = 0;
  if (d > 1e-6) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        hue = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        hue = ((b - r) / d + 2) / 6;
        break;
      default:
        hue = ((r - g) / d + 4) / 6;
        break;
    }
  }
  const H = Math.round(hue * 360);
  const S = Math.round(s * 1000) / 10;
  const L = Math.round(l * 1000) / 10;
  return `${H} ${S}% ${L}%`;
}

function pickHex(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s)) return s.startsWith("#") ? s : `#${s}`;
  return null;
}

function getCurrentSettingsBlock(root: unknown): Record<string, unknown> | null {
  if (!root || typeof root !== "object" || Array.isArray(root)) return null;
  const o = root as Record<string, unknown>;
  const cur = o.current;
  if (cur && typeof cur === "object" && !Array.isArray(cur)) {
    return cur as Record<string, unknown>;
  }
  if (typeof cur === "string" && o.presets && typeof o.presets === "object") {
    const presets = o.presets as Record<string, unknown>;
    const block = presets[cur as string];
    if (block && typeof block === "object" && !Array.isArray(block)) {
      return block as Record<string, unknown>;
    }
  }
  return null;
}

/**
 * Maps common Shopify / Material-theme `settings_data.json` keys into Paper Flight storefront CSS variables.
 * Unknown themes still benefit from generic hex harvesting (first few colors).
 */
export function mapShopifySettingsToStorefrontTokens(settings: Record<string, unknown>) {
  const pairs: Array<{ key: string; hex: string }> = [];

  const add = (tokenKey: string, settingKey: string) => {
    const hex = pickHex(settings[settingKey]);
    if (hex) pairs.push({ key: tokenKey, hex });
  };

  add("background", "b_scaffolding_bg");
  add("foreground", "b_scaffolding_color");
  add("primary", "btn_btn1_bg");
  add("primary-foreground", "btn_btn1_txt");
  add("secondary", "btn_btn_bg");
  add("secondary-foreground", "btn_btn_txt");
  add("muted", "b_tables_bg_accent");
  add("muted-foreground", "general_title_colour");
  add("accent", "b_links_colour_hover");
  add("accent-foreground", "b_scaffolding_color");
  add("border", "b_forms_input_border");
  add("input", "b_forms_input_border");
  add("ring", "btn_btn1_bg_hover");
  add("card", "b_tables_bg");
  add("card-foreground", "general_heading_colour");
  add("destructive", "b_states_alerts_error_bg");
  add("destructive-foreground", "b_states_alerts_error_txt");

  const tokens: Array<{ tokenKey: string; value: string; groupName: string | null }> = [];
  for (const { key, hex } of pairs) {
    const hsl = hexToHslTriplet(hex);
    if (hsl) tokens.push({ tokenKey: key, value: hsl, groupName: "brand" });
  }
  return tokens;
}

function harvestHexes(settings: Record<string, unknown>, limit: number): string[] {
  const out: string[] = [];
  const walk = (v: unknown) => {
    if (out.length >= limit) return;
    if (typeof v === "string") {
      const hex = pickHex(v);
      if (hex && !out.includes(hex)) out.push(hex);
      return;
    }
    if (v && typeof v === "object" && !Array.isArray(v)) {
      for (const x of Object.values(v as Record<string, unknown>)) walk(x);
    }
  };
  walk(settings);
  return out;
}

/**
 * Reads `public/...` Shopify theme ZIP, parses `config/settings_data.json`, returns style tokens for the first draft theme version.
 */
export async function extractStyleTokensFromShopifyThemeZip(packageFile: string) {
  const rel = packageFile.startsWith("/") ? packageFile.slice(1) : packageFile;
  const abs = path.join(process.cwd(), "public", rel);
  try {
    await fs.access(abs);
  } catch {
    return [] as Array<{ tokenKey: string; value: string; groupName: string | null }>;
  }

  const zip = new StreamZip.async({ file: abs });
  let raw: Buffer;
  try {
    raw = await zip.entryData("config/settings_data.json");
  } catch {
    await zip.close().catch(() => {});
    return [] as Array<{ tokenKey: string; value: string; groupName: string | null }>;
  }
  await zip.close();

  let root: unknown;
  try {
    root = JSON.parse(raw.toString("utf8"));
  } catch {
    return [];
  }

  const current = getCurrentSettingsBlock(root);
  if (!current) return [];

  let tokens = mapShopifySettingsToStorefrontTokens(current);
  if (tokens.length < 4) {
    const hexes = harvestHexes(current, 8);
    const keys = ["background", "foreground", "primary", "primary-foreground", "muted", "border", "ring", "card"];
    const extra: Array<{ tokenKey: string; value: string; groupName: string | null }> = [];
    const have = new Set(tokens.map((t) => t.tokenKey));
    hexes.forEach((hex, i) => {
      const key = keys[i];
      if (!key || have.has(key)) return;
      const hsl = hexToHslTriplet(hex);
      if (hsl) {
        extra.push({ tokenKey: key, value: hsl, groupName: "brand" });
        have.add(key);
      }
    });
    tokens = [...tokens, ...extra];
  }

  return tokens;
}
