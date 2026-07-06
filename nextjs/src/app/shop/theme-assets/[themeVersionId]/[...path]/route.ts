import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

import { prisma } from "@/lib/prisma";
import { findDomainByHostname } from "@/lib/storefront/services/domain-service";
import { compileThemeScssCssIfNeeded } from "@/lib/storefront/liquid/compile-theme-scss-css";
import {
  extractShopifyThemeForLiquid,
  extractShopifyThemeZipForWebsite,
  liquidThemeExtractExists,
  liquidThemeExtractRoot,
  liquidWebsiteStorefrontExtractExists,
  liquidWebsiteStorefrontRoot,
} from "@/lib/storefront/liquid/extract-shopify-theme";
import {
  normalizeShopThemeAssetUnderscoreUrls,
  rewriteShopifyCdnAssetUrlsInCss,
  themeAssetsPublicBase,
} from "@/lib/storefront/liquid/shopify-theme-css-url-rewrite";
import {
  tryReadThemeLogoAssetOverride,
  tryReadThemeRemoteAssetOverride,
} from "@/lib/storefront/liquid/theme-remote-asset-overrides";
import { storefrontAuthorityForUrls, storefrontHostnameForLookup } from "@/lib/storefront/storefront-host-header";

export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".cjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".eot": "application/vnd.ms-fontobject",
  ".ico": "image/x-icon",
  ".map": "application/json; charset=utf-8",
  /** Avoid `application/octet-stream` on HTML/media — Chrome may prompt to save (“blank.html”) instead of handling inline. */
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

function contentTypeForPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME[ext] ?? "application/octet-stream";
}

/** `NextResponse` / `Blob` typings reject pooled buffers; copy into a dedicated `ArrayBuffer`. */
function bufferAsResponseBody(buf: Buffer, contentType: string): Blob {
  const copy = Buffer.from(buf);
  return new Blob([copy], { type: contentType });
}

/** Shopify-hosted bundles not present in a downloadable ZIP; loaders still import them at runtime. */
function isShopifyOnlyBundlePath(rel: string): boolean {
  const norm = rel.replace(/^\/+/, "");
  return /^assets\/(?:scripts|remote)(\/|$)/i.test(norm);
}

/** Do not stub real media/fonts from the theme ZIP (only Shopify “virtual” bundles live under scripts/remote). */
function isLikelyBinaryThemeAsset(rel: string): boolean {
  return /\.(png|jpe?g|gif|webp|svg|ico|woff2?|ttf|eot|mp4|webm|mov|zip|wasm|avif)$/i.test(rel);
}

const REMOTE_VIDEO_PLACEHOLDER_DIR = path.join(process.cwd(), "public", "storefront", "placeholders");

/** Theme ZIPs often omit CDN-backed `assets/remote/*.mp4`; serve a tiny silent clip so `<video>` does not 404. */
async function readRemoteVideoPlaceholder(rel: string): Promise<{ buf: Buffer; contentType: string } | null> {
  if (!isShopifyOnlyBundlePath(rel)) return null;
  const ext = path.extname(rel).toLowerCase();
  const map: Record<string, { file: string; contentType: string }> = {
    ".mp4": { file: "silent-tiny.mp4", contentType: "video/mp4" },
    ".webm": { file: "silent-tiny.webm", contentType: "video/webm" },
    /** Many players accept MP4 bytes with quicktime type for short loops. */
    ".mov": { file: "silent-tiny.mp4", contentType: "video/quicktime" },
  };
  const entry = map[ext];
  if (!entry) return null;
  const abs = path.join(REMOTE_VIDEO_PLACEHOLDER_DIR, entry.file);
  if (!abs.startsWith(REMOTE_VIDEO_PLACEHOLDER_DIR)) return null;
  try {
    const buf = await fs.readFile(abs);
    return { buf, contentType: entry.contentType };
  } catch {
    return null;
  }
}

function protocolFromRequest(req: NextRequest): string {
  const xfProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
  return xfProto === "http" ? "http:" : "https:";
}

function assetOkHeaders(contentType: string, cacheControl: string): Record<string, string> {
  return {
    "Content-Type": contentType,
    "Cache-Control": cacheControl,
    /** Prefer inline handling; avoids Chrome treating some responses as forced downloads. */
    "Content-Disposition": "inline",
  };
}

/** Hashed Shopify remote assets and fonts are immutable for a given theme extract — safe to cache longer at the edge/browser. */
function cacheControlForThemeAsset(rel: string): string {
  const norm = rel.replace(/\\/g, "/").toLowerCase();
  if (norm.includes("/assets/remote/")) {
    return "public, max-age=604800, stale-while-revalidate=86400";
  }
  if (/\.(woff2?|ttf|otf|eot)$/i.test(norm)) {
    return "public, max-age=604800, stale-while-revalidate=86400";
  }
  if (/\/assets\/.+\.(png|jpe?g|gif|webp|svg|ico|avif)$/i.test(norm)) {
    return "public, max-age=86400, stale-while-revalidate=3600";
  }
  return "public, max-age=3600";
}

/** Serves a file that exists on disk as-is (incl. `*.scss.css` if the ZIP already has it). */
async function resolveStaticAssetAbs(root: string, rel: string): Promise<string | null> {
  const tryOne = async (abs: string): Promise<string | null> => {
    if (!abs.startsWith(root)) return null;
    try {
      const st = await fs.stat(abs);
      return st.isFile() ? abs : null;
    } catch {
      return null;
    }
  };

  const primary = path.join(root, ...rel.split("/").filter(Boolean));
  const hit = await tryOne(primary);
  if (hit) return hit;

  if (/\.scss\.css$/i.test(rel)) {
    const asPlainCss = rel.replace(/\.scss\.css$/i, ".css");
    return tryOne(path.join(root, ...asPlainCss.split("/").filter(Boolean)));
  }

  return null;
}

/**
 * Serves extracted Shopify theme static files (`assets/`, etc.) for the active theme version on this hostname.
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ themeVersionId: string; path?: string[] }> },
) {
  const { themeVersionId, path: pathParts = [] } = await ctx.params;
  if (!/^\d+$/.test(themeVersionId)) {
    return new NextResponse("Invalid theme version.", { status: 400 });
  }

  const hostRaw = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  const hostname = storefrontHostnameForLookup(hostRaw);
  const domain = hostname ? await findDomainByHostname(hostname) : null;
  if (!domain?.website) {
    return new NextResponse("Not found.", { status: 404 });
  }

  const orgId = domain.website.organizationId;
  const websiteId = domain.website.id;

  const site = await prisma.website.findFirst({
    where: { id: websiteId, organizationId: orgId },
    select: { metadata: true },
  });
  const meta =
    site?.metadata && typeof site.metadata === "object" && !Array.isArray(site.metadata)
      ? (site.metadata as Record<string, unknown>)
      : {};

  const pkg =
    typeof meta.shopifyLiquidPackageFile === "string" ? String(meta.shopifyLiquidPackageFile).trim() : "";
  const usesWebsiteZip = pkg.length > 0;
  const websiteIdStr = String(websiteId);
  const activeTvStr = String(meta.activeThemeVersionId ?? "");

  if (usesWebsiteZip) {
    /** Prefer `websiteId` in URLs; still accept legacy `activeThemeVersionId` segment until HTML caches refresh. */
    if (themeVersionId !== websiteIdStr && themeVersionId !== activeTvStr) {
      return new NextResponse("Forbidden.", { status: 403 });
    }
  } else if (activeTvStr !== themeVersionId) {
    return new NextResponse("Forbidden.", { status: 403 });
  }

  const rel = pathParts.join("/");
  if (!rel || rel.includes("..")) {
    return new NextResponse("Bad path.", { status: 400 });
  }

  const root = usesWebsiteZip
    ? liquidWebsiteStorefrontRoot(orgId, websiteId)
    : liquidThemeExtractRoot(orgId, BigInt(activeTvStr || themeVersionId));
  const abs = path.join(root, ...rel.split("/"));
  if (!abs.startsWith(root)) {
    return new NextResponse("Bad path.", { status: 400 });
  }

  const authority = storefrontAuthorityForUrls(hostRaw);
  const assetBaseUrl = `${protocolFromRequest(req)}//${authority}`;
  const themeAssetsBase = themeAssetsPublicBase(assetBaseUrl, themeVersionId);

  const remoteOverride = await tryReadThemeRemoteAssetOverride(rel);
  if (remoteOverride) {
    return new NextResponse(bufferAsResponseBody(remoteOverride.buf, remoteOverride.contentType), {
      status: 200,
      headers: assetOkHeaders(remoteOverride.contentType, cacheControlForThemeAsset(rel)),
    });
  }

  const logoOverride = await tryReadThemeLogoAssetOverride(rel);
  if (logoOverride) {
    return new NextResponse(bufferAsResponseBody(logoOverride.buf, logoOverride.contentType), {
      status: 200,
      headers: assetOkHeaders(logoOverride.contentType, cacheControlForThemeAsset(rel)),
    });
  }

  let staticAbs = await resolveStaticAssetAbs(root, rel);
  if (!staticAbs) {
    if (usesWebsiteZip) {
      const extractOk = await liquidWebsiteStorefrontExtractExists(orgId, websiteId);
      if (!extractOk) {
        try {
          await extractShopifyThemeZipForWebsite(orgId, websiteId, pkg);
          staticAbs = await resolveStaticAssetAbs(root, rel);
        } catch (e) {
          console.warn("[theme-assets] website re-extract failed:", e);
        }
      }
    } else {
      const tvId = BigInt(themeVersionId);
      const extractOk = await liquidThemeExtractExists(orgId, tvId);
      if (!extractOk) {
        const tv = await prisma.themeVersion.findFirst({
          where: { id: tvId, organizationId: orgId },
          include: { theme: { select: { metadata: true } } },
        });
        const thMeta = tv?.theme.metadata as Record<string, unknown> | null;
        if (thMeta?.kind === "shopify_zip" && typeof thMeta.packageFile === "string") {
          try {
            await extractShopifyThemeForLiquid(orgId, tvId, thMeta.packageFile);
            staticAbs = await resolveStaticAssetAbs(root, rel);
          } catch (e) {
            console.warn("[theme-assets] re-extract failed:", e);
          }
        }
      }
    }
  }

  if (staticAbs) {
    const ct = contentTypeForPath(staticAbs);
    if (ct === "text/css; charset=utf-8") {
      const raw = await fs.readFile(staticAbs, "utf8");
      const css = normalizeShopThemeAssetUnderscoreUrls(rewriteShopifyCdnAssetUrlsInCss(raw, themeAssetsBase));
      return new NextResponse(css, {
        status: 200,
        headers: assetOkHeaders(ct, cacheControlForThemeAsset(rel)),
      });
    }
    const buf = await fs.readFile(staticAbs);
    return new NextResponse(bufferAsResponseBody(buf, ct), {
      status: 200,
      headers: assetOkHeaders(ct, cacheControlForThemeAsset(rel)),
    });
  }

  const compiled = await compileThemeScssCssIfNeeded({
    themeRoot: root,
    themeVersionId,
    assetBaseUrl,
    requestedRel: rel,
  });
  if (compiled != null) {
    return new NextResponse(compiled, {
      status: 200,
      headers: assetOkHeaders("text/css; charset=utf-8", "public, max-age=300"),
    });
  }

  if (isShopifyOnlyBundlePath(rel) && !isLikelyBinaryThemeAsset(rel)) {
    const lower = rel.toLowerCase();
    if (lower.endsWith(".css")) {
      return new NextResponse("/* offline */\n", {
        status: 200,
        headers: assetOkHeaders("text/css; charset=utf-8", "public, max-age=300"),
      });
    }
    if (lower.endsWith(".json")) {
      return new NextResponse("{}\n", {
        status: 200,
        headers: assetOkHeaders("application/json; charset=utf-8", "public, max-age=300"),
      });
    }
    /** Classic + ES module safe; satisfies dynamic `import()` without 404. */
    return new NextResponse("void 0;\n", {
      status: 200,
      headers: assetOkHeaders("application/javascript; charset=utf-8", "public, max-age=300"),
    });
  }

  const videoPh = await readRemoteVideoPlaceholder(rel);
  if (videoPh) {
    return new NextResponse(bufferAsResponseBody(videoPh.buf, videoPh.contentType), {
      status: 200,
      headers: assetOkHeaders(videoPh.contentType, "public, max-age=86400"),
    });
  }

  return new NextResponse("Not found.", { status: 404 });
}
