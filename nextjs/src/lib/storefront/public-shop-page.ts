import { prisma } from "@/lib/prisma";
import { getSettingsForOwner } from "@/lib/settings-service";
import { buildPublicStorefrontSettings, type PublicStorefrontBrandSettings } from "@/lib/storefront/public-storefront-settings";
import {
  normalizeThemeCustomizerContentState,
  type ThemeCustomizerContentState,
} from "@/lib/storefront/theme-customizer-content";
import { isTrustIconsCustomizerActive } from "@/lib/storefront/theme-customizer-trust-icons";

export type PublicShopBlock = {
  id: string;
  sortOrder: number;
  data: unknown;
};

export type PublicShopSection = {
  id: string;
  sortOrder: number;
  instanceKey: string | null;
  settings: unknown;
  blocks: PublicShopBlock[];
};

export type PublicShopPagePayload = {
  pageTitle: string;
  pageSlug: string;
  sections: PublicShopSection[];
  styleVars: Record<string, string>;
  publicSettings: PublicStorefrontBrandSettings;
  websiteId: string;
};

function slugFromPath(path: string): string {
  const p = path.replace(/^\//, "").replace(/\/$/, "");
  return p === "" ? "home" : p;
}

/** Theme CSS variables for the active theme version on this website (Day 14 / 18). */
export async function getStorefrontThemeCssVars(organizationId: bigint, websiteId: bigint): Promise<Record<string, string>> {
  const site = await prisma.website.findFirst({
    where: { id: websiteId, organizationId },
    select: { metadata: true },
  });
  const meta =
    site?.metadata && typeof site.metadata === "object" && !Array.isArray(site.metadata)
      ? (site.metadata as Record<string, unknown>)
      : {};
  const raw = meta.activeThemeVersionId;
  if (raw == null || raw === "") return {};
  let themeVersionId: bigint;
  try {
    themeVersionId = BigInt(String(raw));
  } catch {
    return {};
  }
  const tokens = await prisma.themeStyleToken.findMany({
    where: { themeVersionId, organizationId },
    select: { tokenKey: true, value: true },
  });
  const out: Record<string, string> = {};
  for (const t of tokens) {
    out[t.tokenKey] = t.value;
  }
  return out;
}

/** Homepage copy / image overrides for the active theme version (ThemeVersion.metadata.customizerContent). */
export async function getStorefrontThemeCustomizerContent(
  organizationId: bigint,
  websiteId: bigint,
): Promise<ThemeCustomizerContentState | null> {
  const site = await prisma.website.findFirst({
    where: { id: websiteId, organizationId },
    select: { metadata: true },
  });
  const meta =
    site?.metadata && typeof site.metadata === "object" && !Array.isArray(site.metadata)
      ? (site.metadata as Record<string, unknown>)
      : {};
  const rawVid = meta.activeThemeVersionId;
  if (rawVid == null || rawVid === "") return null;
  let themeVersionId: bigint;
  try {
    themeVersionId = BigInt(String(rawVid));
  } catch {
    return null;
  }
  const tv = await prisma.themeVersion.findFirst({
    where: { id: themeVersionId, organizationId },
    select: { metadata: true },
  });
  const vm =
    tv?.metadata && typeof tv.metadata === "object" && !Array.isArray(tv.metadata)
      ? (tv.metadata as Record<string, unknown>)
      : {};
  const cc = vm.customizerContent;
  if (cc == null) return null;
  const normalized = normalizeThemeCustomizerContentState(cc);
  const heroCount = normalized.heroSlider?.slides?.length ?? 0;
  const intro = normalized.introSection;
  const introAny =
    (intro?.heading?.trim() ?? "") !== "" ||
    (intro?.headingHighlightWord?.trim() ?? "") !== "" ||
    (intro?.buttonText?.trim() ?? "") !== "" ||
    (intro?.buttonHref?.trim() ?? "") !== "" ||
    (intro?.bodyHtml?.trim() ?? "") !== "";
  const fp = normalized.featuredProducts;
  const featuredAny =
    fp != null &&
    (fp.showSpotlightSection === false || fp.prioritizeFeaturedInHomeGrid === true);
  const ba = normalized.beforeAfterSection;
  const beforeAfterAny =
    (ba?.subheading?.trim() ?? "") !== "" ||
    (ba?.mainHeading?.trim() ?? "") !== "" ||
    (ba?.beforeImageUrl?.trim() ?? "") !== "" ||
    (ba?.beforeImageAlt?.trim() ?? "") !== "" ||
    (ba?.beforeLabelSmall?.trim() ?? "") !== "" ||
    (ba?.beforeLabelLarge?.trim() ?? "") !== "" ||
    (ba?.afterImageUrl?.trim() ?? "") !== "" ||
    (ba?.afterImageAlt?.trim() ?? "") !== "" ||
    (ba?.afterLabelSmall?.trim() ?? "") !== "" ||
    (ba?.afterLabelLarge?.trim() ?? "") !== "";
  const mq = normalized.marqueeText;
  const marqueeAny = (mq?.text?.trim() ?? "") !== "";
  const fs = normalized.footerSection;
  const footerAny =
    fs != null &&
    ((fs.mainBackgroundRgb?.trim() ?? "") !== "" ||
      (fs.logoImageUrl?.trim() ?? "") !== "" ||
      (fs.columnATitle?.trim() ?? "") !== "" ||
      (fs.columnBTitle?.trim() ?? "") !== "" ||
      (fs.phoneDisplay?.trim() ?? "") !== "" ||
      (fs.emailDisplay?.trim() ?? "") !== "" ||
      (fs.newsletterHeading?.trim() ?? "") !== "" ||
      (fs.copyrightHtml?.trim() ?? "") !== "" ||
      (fs.subFooterBackgroundRgb?.trim() ?? "") !== "" ||
      fs.hideLocalization === true ||
      fs.hidePaymentIcons === true ||
      (fs.columnALinks?.some((l) => (l.label?.trim() ?? "") !== "" || (l.href?.trim() ?? "") !== "") ?? false) ||
      (fs.columnBLinks?.some((l) => (l.label?.trim() ?? "") !== "" || (l.href?.trim() ?? "") !== "") ?? false) ||
      (fs.socialFacebook?.trim() ?? "") !== "" ||
      (fs.socialTwitter?.trim() ?? "") !== "" ||
      (fs.socialInstagram?.trim() ?? "") !== "" ||
      (fs.socialYoutube?.trim() ?? "") !== "" ||
      (fs.socialLinks?.some((sl) => (sl.url?.trim() ?? "") !== "") ?? false));
  const trustIconsAny =
    normalized.trustIconsSection != null && isTrustIconsCustomizerActive(normalized.trustIconsSection);
  if (
    (normalized.images?.length ?? 0) === 0 &&
    (normalized.texts?.length ?? 0) === 0 &&
    heroCount === 0 &&
    !introAny &&
    !featuredAny &&
    !beforeAfterAny &&
    !marqueeAny &&
    !trustIconsAny &&
    !footerAny
  ) {
    return null;
  }
  return normalized;
}

/**
 * Loads the published page version for the public storefront (Day 14).
 * Returns null if the page is missing or has no published snapshot.
 */
export async function getPublishedShopPagePayload(
  organizationId: bigint,
  websiteId: bigint,
  path: string,
): Promise<PublicShopPagePayload | null> {
  const settings = await getSettingsForOwner(organizationId);
  const publicSettings = buildPublicStorefrontSettings(settings);
  const styleVars = await getStorefrontThemeCssVars(organizationId, websiteId);

  const slug = slugFromPath(path);
  const page = await prisma.page.findFirst({
    where: { websiteId, organizationId, slug },
    select: { id: true, title: true, slug: true, metadata: true },
  });
  if (!page) {
    return null;
  }

  const meta =
    page.metadata && typeof page.metadata === "object" && !Array.isArray(page.metadata)
      ? (page.metadata as Record<string, unknown>)
      : {};
  const pvRaw = meta.publishedVersionId;
  if (pvRaw == null || pvRaw === "") {
    return null;
  }
  let publishedVersionId: bigint;
  try {
    publishedVersionId = BigInt(String(pvRaw));
  } catch {
    return null;
  }

  const version = await prisma.pageVersion.findFirst({
    where: {
      id: publishedVersionId,
      pageId: page.id,
      organizationId,
      status: "published",
    },
    include: {
      sections: {
        orderBy: { sortOrder: "asc" },
        include: {
          blocks: { orderBy: { sortOrder: "asc" } },
        },
      },
    },
  });
  if (!version) {
    return null;
  }

  const sections: PublicShopSection[] = version.sections.map((s) => ({
    id: s.id.toString(),
    sortOrder: s.sortOrder,
    instanceKey: s.instanceKey,
    settings: s.settings ?? null,
    blocks: s.blocks.map((b) => ({
      id: b.id.toString(),
      sortOrder: b.sortOrder,
      data: b.data ?? null,
    })),
  }));

  return {
    pageTitle: page.title,
    pageSlug: page.slug,
    sections,
    styleVars,
    publicSettings,
    websiteId: websiteId.toString(),
  };
}

/** Minimal `page` drop for Shopify `page.liquid` when a CMS page exists (section HTML is not inlined here). */
export async function getPublishedPageLiquidDrop(
  organizationId: bigint,
  websiteId: bigint,
  path: string,
): Promise<{ handle: string; title: string; content: string; url: string } | null> {
  const slug = slugFromPath(path);
  const page = await prisma.page.findFirst({
    where: { websiteId, organizationId, slug },
    select: { title: true, slug: true },
  });
  if (!page) return null;
  const handle = page.slug.includes("/") ? page.slug.split("/").pop() ?? page.slug : page.slug;
  const url = path.startsWith("/") ? path : `/${path}`;
  return {
    handle,
    title: page.title,
    content: `<p class="pf-liquid-page-notice">This page is published in Paper Flight’s page builder. Builder sections are not rendered inside the Liquid theme yet; use the native storefront route or extend rendering to map sections to HTML.</p>`,
    url,
  };
}
