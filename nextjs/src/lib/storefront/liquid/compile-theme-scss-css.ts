import "server-only";

import fs from "fs/promises";
import path from "path";
import { pathToFileURL } from "url";

import * as sass from "sass";

import { createShopifyThemeLiquidEngine } from "./shopify-liquid-engine";
import {
  normalizeShopThemeAssetUnderscoreUrls,
  rewriteShopifyCdnAssetUrlsInCss,
  themeAssetsPublicBase,
} from "./shopify-theme-css-url-rewrite";

type CacheEntry = { mtimeMs: number; css: string };
const compileCache = new Map<string, CacheEntry>();

function loadPathsFor(themeRoot: string) {
  return [path.join(themeRoot, "assets"), themeRoot];
}

async function loadShopifyThemeSettings(themeRoot: string): Promise<Record<string, unknown>> {
  try {
    const raw = await fs.readFile(path.join(themeRoot, "config", "settings_data.json"), "utf8");
    const j = JSON.parse(raw) as { current?: unknown };
    if (j.current && typeof j.current === "object" && !Array.isArray(j.current)) {
      return j.current as Record<string, unknown>;
    }
  } catch {
    /* ignore */
  }
  return {};
}

/**
 * Shopify serves compiled `*.scss.css`; theme ZIPs usually ship `*.scss` / `*.scss.liquid` only.
 * Compile on demand for the theme-assets route.
 */
export async function compileThemeScssCssIfNeeded(opts: {
  themeRoot: string;
  themeVersionId: string;
  assetBaseUrl: string;
  /** Path relative to theme root, e.g. `assets/rt.global.scss.css` */
  requestedRel: string;
}): Promise<string | null> {
  const { themeRoot, themeVersionId, assetBaseUrl, requestedRel } = opts;
  const lower = requestedRel.toLowerCase();
  if (!lower.endsWith(".scss.css")) return null;

  const withoutCss = requestedRel.slice(0, -".css".length);
  const scssAbs = path.join(themeRoot, withoutCss);
  const liquidAbs = `${scssAbs}.liquid`;

  const tryCompile = async (
    sourceAbs: string,
    sourceKind: "scss" | "liquid",
    liquidContext: Record<string, unknown>,
    cacheMtimeKey: number,
  ): Promise<string | null> => {
    let st: Awaited<ReturnType<typeof fs.stat>>;
    try {
      st = await fs.stat(sourceAbs);
    } catch {
      return null;
    }
    const cacheKey = `${sourceAbs}\0${sourceKind}\0${cacheMtimeKey}`;
    const cached = compileCache.get(cacheKey);
    if (cached && cached.mtimeMs === st.mtimeMs) {
      return cached.css;
    }

    let input: string;
    if (sourceKind === "liquid") {
      const raw = await fs.readFile(sourceAbs, "utf8");
      const engine = createShopifyThemeLiquidEngine(themeRoot, themeVersionId, assetBaseUrl);
      try {
        input = await engine.parseAndRender(raw, liquidContext, {});
      } catch (e) {
        console.warn("[compileThemeScssCssIfNeeded] Liquid preprocess failed:", sourceAbs, e);
        return null;
      }
    } else {
      input = sourceAbs;
    }

    const sassOpts: sass.Options<"sync"> = {
      loadPaths: loadPathsFor(themeRoot),
      style: "compressed",
      /** ThemeForest SCSS predates Sass module system; suppress noisy stderr in dev/prod. */
      silenceDeprecations: ["import", "global-builtin", "color-functions"],
    };
    try {
      const result =
        sourceKind === "liquid"
          ? sass.compileString(input, {
              ...sassOpts,
              url: pathToFileURL(sourceAbs),
            })
          : sass.compile(sourceAbs, sassOpts);
      const themeAssets = themeAssetsPublicBase(assetBaseUrl, themeVersionId);
      const css = normalizeShopThemeAssetUnderscoreUrls(rewriteShopifyCdnAssetUrlsInCss(result.css, themeAssets));
      compileCache.set(cacheKey, { mtimeMs: st.mtimeMs, css });
      return css;
    } catch (e) {
      console.warn("[compileThemeScssCssIfNeeded] sass compile failed:", sourceAbs, e);
      return null;
    }
  };

  const settings = await loadShopifyThemeSettings(themeRoot);
  const liquidContext: Record<string, unknown> = { settings };
  let settingsDataMtime = 0;
  try {
    settingsDataMtime = (await fs.stat(path.join(themeRoot, "config", "settings_data.json"))).mtimeMs;
  } catch {
    /* no settings file */
  }

  /** Shopify compiles from `*.scss.liquid` with theme settings; plain `*.scss` is a fallback only. */
  let css = await tryCompile(liquidAbs, "liquid", liquidContext, settingsDataMtime);
  if (css != null) return css;
  css = await tryCompile(scssAbs, "scss", liquidContext, 0);
  return css;
}
