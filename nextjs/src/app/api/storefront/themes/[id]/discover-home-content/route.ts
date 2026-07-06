import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { assertStorefrontApiAccess } from "@/lib/storefront-access";
import { requireStorefrontOrganization } from "@/lib/storefront/api-org";
import { STOREFRONT_PERMISSION } from "@/lib/storefront-permissions";
import { getThemeWithLatestVersion, resolveThemeExtractRootPath } from "@/lib/storefront/services/theme-service";
import { discoverHeroSliderFromHtml } from "@/lib/storefront/theme-customizer-hero-slider";
import { discoverImageUrlsInHtml } from "@/lib/storefront/theme-customizer-content";
import { discoverIntroSectionFromHtml } from "@/lib/storefront/theme-customizer-intro-section";
import { discoverBeforeAfterFromHtml } from "@/lib/storefront/theme-customizer-before-after";
import { discoverMarqueeTextFromHtml } from "@/lib/storefront/theme-customizer-marquee-text";
import { discoverFooterFromHtml } from "@/lib/storefront/theme-customizer-footer";
import { discoverTrustIconsFromHtml } from "@/lib/storefront/theme-customizer-trust-icons";
import { discoverBundleSectionFromHtml } from "@/lib/storefront/theme-customizer-bundle-section";
import { discoverTopHeaderFromHtml } from "@/lib/storefront/theme-customizer-top-header";
import { discoverSocialLinksFromHtml } from "@/lib/storefront/theme-customizer-social-links";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await assertStorefrontApiAccess(req, { permission: STOREFRONT_PERMISSION.VIEW });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const { id } = await ctx.params;
  let themeId: bigint;
  try {
    themeId = BigInt(id);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid theme id." }, { status: 400 });
  }

  const theme = await getThemeWithLatestVersion(org.organizationId, themeId);
  const version = theme?.versions?.[0];
  if (!theme || !version) {
    return NextResponse.json({ ok: false, message: "Theme not found." }, { status: 404 });
  }

  const themeRoot = await resolveThemeExtractRootPath(org.organizationId, theme.websiteId, version.id);
  if (!themeRoot) {
    return NextResponse.json({
      ok: true,
      imageUrls: [] as string[],
      heroSliderSlides: [] as unknown[],
      introSection: null as unknown,
      beforeAfterSection: null as unknown,
      marqueeText: null as unknown,
      footerSection: null as unknown,
      trustIconsSection: null as unknown,
      bundleSection: null as unknown,
      topHeader: null as unknown,
      socialLinks: null as unknown,
      message: "Theme files are not on this server yet. Publish the theme or open the storefront once.",
    });
  }

  const indexPath = path.join(themeRoot, "index.html");
  let html: string;
  try {
    html = await fs.readFile(indexPath, "utf8");
  } catch {
    return NextResponse.json({
      ok: true,
      imageUrls: [] as string[],
      heroSliderSlides: [] as unknown[],
      introSection: null as unknown,
      beforeAfterSection: null as unknown,
      marqueeText: null as unknown,
      footerSection: null as unknown,
      trustIconsSection: null as unknown,
      bundleSection: null as unknown,
      topHeader: null as unknown,
      socialLinks: null as unknown,
      message: "No index.html found in this theme (not a static Concept-style export).",
    });
  }

  const imageUrls = discoverImageUrlsInHtml(html);
  const discovered = discoverHeroSliderFromHtml(html);
  const introSection = discoverIntroSectionFromHtml(html);
  const beforeAfterSection = discoverBeforeAfterFromHtml(html);
  const marqueeText = discoverMarqueeTextFromHtml(html);
  const footerSection = discoverFooterFromHtml(html);
  const trustIconsSection = discoverTrustIconsFromHtml(html);
  const bundleSection = discoverBundleSectionFromHtml(html);
  const topHeader = discoverTopHeaderFromHtml(html);
  const socialLinks = discoverSocialLinksFromHtml(html);
  const heroSliderSlides = discovered.map((s) => ({
    id: randomUUID(),
    sortIndex: s.sortIndex,
    imageUrl: s.imageUrl,
    heading: s.heading,
    buttonText: s.buttonText,
    buttonHref: s.buttonHref,
  }));

  return NextResponse.json({
    ok: true,
    imageUrls,
    heroSliderSlides,
    introSection,
    beforeAfterSection,
    marqueeText,
    footerSection,
    trustIconsSection,
    bundleSection,
    topHeader,
    socialLinks,
  });
}
