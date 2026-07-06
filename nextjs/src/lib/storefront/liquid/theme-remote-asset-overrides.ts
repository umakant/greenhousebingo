import "server-only";

import fs from "fs/promises";
import path from "path";

const OVERRIDE_DIR = path.join(process.cwd(), "public", "storefront", "philly-water-ice");

/** Theme header / sticky logo filenames in the ZIP → single branded file under `philly-water-ice/`. */
const LOGO_ASSET_RELS = new Set(["assets/logo.png", "assets/logo2x.png", "assets/logo_sticky.png"]);

/**
 * Concept / OS2 themes reference Shopify CDN `assets/remote/{hash}.webp` for slideshow media.
 * Those files are often absent from the ZIP; when present we still prefer branded hero art here.
 */
/** Slide 1–2 remotes; for slide 3 add another `basename → hero-slide-3.png` entry from Network tab. */
const REMOTE_BASENAME_TO_FILE: Record<string, string> = {
  e4688107316144a5c7ea: "hero-slide-1.png",
  "3cd6165da0f39cd90f69": "hero-slide-2.png",
  /** Header logo slot (`assets/remote/5e0aca1a44a06585056b.webp` in Concept theme). */
  "5e0aca1a44a06585056b": "header-logo.png",
  /** Header “white” overlay logo (`assets/remote/c7af3df109b5d40f839c.webp`, `has-white-logo`). */
  c7af3df109b5d40f839c: "header-logo.png",
  /** Comparison / before-after section (e.g. Vibrant Headphone Choices) — branded Philly Water Ice art. */
  "7e66ce41b6488ded2d0e": "compare-slide-left.png",
  adc2839d0385655b995e: "compare-slide-right.png",
  /** Home media-card row — flavor tiles (hashes vary by theme export). */
  "3c26d5c83d93c0c2ac60": "headphones-category.png",
  "8ce3f80a0cf5444f19b3": "category-all-products.png",
  "6a919ea1002ea168ed9a": "category-earphones.png",
  f19cb3e409cc0bb90a6d: "category-speakers.png",
  /** Alternate remote ids used in some `index.html` extracts (Earphones / Speakers tiles). */
  "3fc054102257af200bd8": "category-earphones.png",
  "110b7670b7337a55062f": "category-speakers.png",
  /** Second home media-card row (Accessories / Wireless / Gaming / Limited in theme export). */
  "60b5c02951e69f4d3d71": "category-row2-coconut.png",
  "5334e587baca890deef3": "category-row2-mango.png",
  c6f7ed6b91680fd8ea72: "category-row2-lime.png",
  aa22c7f5c94dbd91434f: "category-row2-cherry.png",
};

function basenameKey(remoteRel: string): string | null {
  const norm = remoteRel.replace(/^\/+/, "").replace(/\\/g, "/");
  if (!/^assets\/remote\//i.test(norm)) return null;
  const base = path.basename(norm).split("?")[0];
  if (!base) return null;
  const lower = base.toLowerCase();
  const withoutExt = lower.replace(/\.(webp|jpg|jpeg|png)$/i, "");
  return withoutExt || null;
}

function normalizeAssetRel(rel: string): string {
  return rel.replace(/^\/+/, "").replace(/\\/g, "/").toLowerCase();
}

function escapeRegExp(s: string): string {
  return s.replace(/[\\^$*+?.()|[\]{}]/g, "\\$&");
}

/**
 * After Liquid renders, replace branded `assets/remote/{hash}.webp` (and other ext) URLs with
 * stable `/storefront/philly-water-ice/*.png` paths so the header logo uses a real `.png` src
 * (theme-assets still serves the same bytes for non-HTML requests).
 */
export function rewriteBrandedRemoteThemeAssetsInHtml(html: string, _themeVersionId: string): string {
  if (!html) return html;
  const ext = "(?:webp|png|jpe?g)";
  const q = "(?:\\?[^\"'\\s<]*)?";
  let out = html;
  for (const [basename, file] of Object.entries(REMOTE_BASENAME_TO_FILE)) {
    const baseEsc = escapeRegExp(basename);
    const publicPath = `/storefront/philly-water-ice/${file}`;
    /** Match any numeric `/shop/theme-assets/{id}/` segment (website id or legacy theme version id). */
    const relReAnyId = new RegExp(
      `(/shop/theme[-_]assets/\\d+/assets/remote/${baseEsc}\\.${ext})${q}`,
      "gi",
    );
    out = out.replace(relReAnyId, publicPath);
    const absReAnyId = new RegExp(
      `(https?:\\/\\/[^"'\\s<]+\\/shop\\/theme[-_]assets\\/\\d+\\/assets\\/remote\\/${baseEsc}\\.${ext})${q}`,
      "gi",
    );
    out = out.replace(absReAnyId, publicPath);
    /** Static export `index.html` / mixed srcset still uses `./assets/remote/{hash}.webp?…`. */
    const dotRel = new RegExp(`(\\.\\/assets\\/remote\\/${baseEsc}\\.${ext})${q}`, "gi");
    out = out.replace(dotRel, publicPath);
  }
  return out;
}

/**
 * Roar Material (and similar) use `{{ 'logo.png' | asset_url }}` for the header. Serve a branded
 * replacement without editing the active theme ZIP.
 */
export async function tryReadThemeLogoAssetOverride(
  rel: string,
): Promise<{ buf: Buffer; contentType: string } | null> {
  const norm = normalizeAssetRel(rel);
  if (!LOGO_ASSET_RELS.has(norm)) return null;
  const abs = path.join(OVERRIDE_DIR, "header-logo.png");
  if (!abs.startsWith(OVERRIDE_DIR)) return null;
  try {
    const buf = await fs.readFile(abs);
    return { buf, contentType: "image/png" };
  } catch {
    return null;
  }
}

export async function tryReadThemeRemoteAssetOverride(
  rel: string,
): Promise<{ buf: Buffer; contentType: string } | null> {
  const key = basenameKey(rel);
  if (!key) return null;
  const file = REMOTE_BASENAME_TO_FILE[key];
  if (!file) return null;
  const abs = path.join(OVERRIDE_DIR, file);
  if (!abs.startsWith(OVERRIDE_DIR)) return null;
  try {
    const buf = await fs.readFile(abs);
    const ext = path.extname(file).toLowerCase();
    const contentType =
      ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "application/octet-stream";
    return { buf, contentType };
  } catch {
    return null;
  }
}
