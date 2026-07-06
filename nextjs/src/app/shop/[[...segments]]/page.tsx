import type { CSSProperties } from "react";
import { Suspense } from "react";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { PublishedPageChrome, PublishedPageView } from "@/components/storefront/public/published-page-view";
import { StorefrontConceptFastHome } from "@/components/storefront/public/storefront-concept-fast-home";
import { StorefrontLiquidHtmlView } from "@/components/storefront/public/storefront-liquid-html-view";
import { StorefrontLiquidReactChrome } from "@/components/storefront/public/storefront-liquid-react-chrome";
import { ShopLiquidThemeHomeFallback } from "@/components/storefront/public/shop-liquid-theme-home-fallback";
import { PublicCartClient } from "@/components/storefront/public/public-cart-client";
import { PublicCheckoutClient } from "@/components/storefront/public/public-checkout-client";
import { StorefrontAccountDashboardClient } from "@/components/storefront/storefront-account-dashboard-client";
import { StorefrontAccountLoginClient } from "@/components/storefront/storefront-account-login-client";
import { PublicStorefrontContactPage } from "@/components/storefront/public/public-storefront-contact-page";
import { EventsLegacyRedirect } from "@/components/events/events-legacy-redirect";
import { PublicCollectionView } from "@/components/storefront/public/public-collection-view";
import { PublicCollectionsListView } from "@/components/storefront/public/public-collections-list-view";
import { PublicProductView } from "@/components/storefront/public/public-product-view";
import { PublicBlogListView, PublicBlogPostView } from "@/components/storefront/public/public-blog-views";
import {
  PublicShopHelpArticle,
  PublicShopHelpHome,
} from "@/components/storefront/public/public-shop-help-center";
import {
  shopRouteFindDomainByHostname,
  shopRouteGetActiveShopifyLiquidTheme,
  shopRouteGetSettingsForOwner,
  shopRouteGetStorefrontThemeCustomizerContent,
  shopRouteGetStorefrontThemeCssVars,
} from "@/lib/storefront/shop-route-request-cache";
import {
  getPublicBlogPostBySlug,
  getPublicCollectionBySlug,
  getPublicFeaturedSpotlightProduct,
  getPublicProductBySlug,
  listFeaturedTabsCollectionsForConceptHome,
  listPublicBlogPostsForConceptLatestStories,
  listPublicBlogPostsForShop,
  listPublicProductsForConceptHomeGrid,
  listPublicStorefrontCollections,
} from "@/lib/storefront/public-catalog";
import { buildPublicStorefrontSettings } from "@/lib/storefront/public-storefront-settings";
import {
  getPublishedPageLiquidDrop,
  getPublishedShopPagePayload,
  getStorefrontThemeCssVars,
} from "@/lib/storefront/public-shop-page";
import { applyStorefrontBrandIdentityToHtml } from "@/lib/storefront/apply-storefront-brand-to-html";
import { applyThemeCustomizerContentToHtml } from "@/lib/storefront/theme-customizer-content";
import { applyConceptHomeCatalogToHtml } from "@/lib/storefront/theme-concept-home-catalog";
import { applyFeaturedCollectionsTabsToHtml } from "@/lib/storefront/theme-concept-featured-collections";
import { applyShopMegaMenuFeaturedTabsToHtml } from "@/lib/storefront/theme-concept-shop-mega-menu";
import { applyCartDrawerEmptyCollectionsToHtml } from "@/lib/storefront/theme-concept-cart-drawer-empty-collections";
import { applyCollectionsMegaMenuCardsToHtml } from "@/lib/storefront/theme-concept-collections-mega-cards";
import { applyConceptLatestStoriesToHtml } from "@/lib/storefront/theme-concept-latest-stories";
import { applyFeaturedSpotlightCatalogToHtml } from "@/lib/storefront/theme-concept-featured-spotlight-catalog";
import { applyBundleCatalogToHtml } from "@/lib/storefront/theme-bundle-section-catalog";
import { applyConceptShopTheFeedEventsToHtml } from "@/lib/storefront/theme-concept-shop-the-feed-events";
import {
  applyStorefrontFooterContactToHtml,
  buildStorefrontFooterContact,
} from "@/lib/storefront/theme-concept-footer-contact";
import { listPublishedEventsForPublicSection } from "@/lib/storefront/storefront-events-prisma";
import { listPublicBundleCatalogProducts, type PublicBundleCatalogProduct } from "@/lib/storefront/bundle-catalog";
import { prisma } from "@/lib/prisma";
import { storefrontProductPublicLiveWhere } from "@/lib/storefront/storefront-product-public-visibility";
import {
  isConceptThemePackageFile,
  loadRewrittenConceptStorefrontIndexHtml,
} from "@/lib/storefront/liquid/concept-static-storefront-html";
import { getCachedConceptHomeHtml } from "@/lib/storefront/cached-concept-home-html";
import { tryRenderShopifyLiquidStorefront } from "@/lib/storefront/liquid/render-storefront-liquid";
import { tryRenderStorefrontThemeChromeHtml } from "@/lib/storefront/liquid/render-storefront-theme-chrome";
import { stripPaperFlightUnsupportedConceptNav } from "@/lib/storefront/liquid/rewrite-storefront-shop-urls-in-html";
import { isStorefrontAppHost, joinStorefrontPublicPath } from "@/lib/storefront/custom-domain-hosts";
import { getStorefrontCustomerSessionForWebsite } from "@/lib/storefront-customer-server";
import { storefrontAuthorityForUrls, storefrontHostnameForLookup } from "@/lib/storefront/storefront-host-header";
import {
  getHelpArticleForStorefrontOrganization,
  listHelpArticlesForStorefrontOrganization,
} from "@/lib/storefront/public-help-center-articles";

/** Theme customizer preview reads fresh ThemeVersion.metadata (avoid stale RSC/cache). */
export const dynamic = "force-dynamic";

function firstSearchParam(
  sp: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const v = sp[key];
  if (typeof v === "string") return v;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  return undefined;
}

/** When theme customizer iframe loads `/shop?pf_preview`, optional `pf_msg_parent` names the admin origin for postMessage. */
function customizerIntroPreviewBridgeOriginFromSearch(
  sp: Record<string, string | string[] | undefined>,
): string | null | undefined {
  if (firstSearchParam(sp, "pf_preview") === undefined) return undefined;
  const raw = firstSearchParam(sp, "pf_msg_parent")?.trim();
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/**
 * Store SEO: defaults from Settings → Storefront; product/collection pages use catalog SEO fields (Day 24).
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ segments?: string[] }>;
}): Promise<Metadata> {
  const segments = ((await params).segments ?? []).map((s) => s.toLowerCase());
  const h = await headers();
  const hostRaw = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const hostname = storefrontHostnameForLookup(hostRaw);

  const domain = hostname ? await shopRouteFindDomainByHostname(hostname) : null;
  if (!domain?.website) {
    return { title: "Storefront" };
  }

  const orgId = domain.website.organizationId;
  const websiteId = domain.website.id;

  if (segments[0] === "products" && segments[1]) {
    let product: Awaited<ReturnType<typeof getPublicProductBySlug>> = null;
    try {
      product = await getPublicProductBySlug(orgId, segments[1]!);
    } catch (e) {
      console.warn("[shop] generateMetadata getPublicProductBySlug failed:", e);
    }
    if (product) {
      const title = product.seoTitle?.trim() || product.name;
      const description =
        product.seoDescription?.trim() ||
        (product.description ? product.description.slice(0, 160) : undefined);
      const ogImage = product.galleryImages[0] ?? product.image;
      return {
        title,
        description,
        openGraph: {
          title,
          description,
          type: "website",
          ...(ogImage ? { images: [{ url: ogImage }] } : {}),
        },
      };
    }
  }

  if (segments[0] === "collections" && segments.length === 1) {
    const settings = await shopRouteGetSettingsForOwner(orgId);
    const pub = buildPublicStorefrontSettings(settings);
    const store = pub.storeName?.trim() || "Shop";
    const title = `Collections — ${store}`;
    const description = pub.seoDefaultDescription?.trim() || `Browse collections at ${store}.`;
    return {
      title,
      description,
      openGraph: { title, description, type: "website" },
    };
  }

  if (segments[0] === "collections" && segments[1]) {
    let col: Awaited<ReturnType<typeof getPublicCollectionBySlug>> = null;
    try {
      col = await getPublicCollectionBySlug(orgId, websiteId, segments[1]!);
    } catch (e) {
      console.warn("[shop] generateMetadata getPublicCollectionBySlug failed:", e);
    }
    if (col) {
      const title = col.seoTitle?.trim() || col.title;
      const description =
        col.seoDescription?.trim() ||
        (col.description ? col.description.slice(0, 160) : undefined);
      return {
        title,
        description,
        openGraph: { title, description, type: "website" },
      };
    }
  }

  if (segments[0] === "blog" && segments[1]) {
    let post: Awaited<ReturnType<typeof getPublicBlogPostBySlug>> = null;
    try {
      post = await getPublicBlogPostBySlug(orgId, websiteId, segments[1]!);
    } catch (e) {
      console.warn("[shop] generateMetadata getPublicBlogPostBySlug failed:", e);
    }
    if (post) {
      const title = post.seoTitle?.trim() || post.title;
      const description =
        post.seoDescription?.trim() ||
        (post.excerpt?.trim() ? post.excerpt.trim().slice(0, 160) : undefined);
      const ogImage = post.featuredImageUrl?.trim();
      return {
        title,
        description,
        openGraph: {
          title,
          description,
          type: "website",
          ...(ogImage ? { images: [{ url: ogImage }] } : {}),
        },
      };
    }
  }

  if (segments[0] === "pages" && segments[1] === "contact") {
    const settingsContact = await shopRouteGetSettingsForOwner(orgId);
    const pubContact = buildPublicStorefrontSettings(settingsContact);
    const title = pubContact.storeName?.trim()
      ? `Contact us — ${pubContact.storeName.trim()}`
      : "Contact us";
    const description =
      "We would love to hear from you. Send a message and our team will get back to you.";
    return {
      title,
      description,
      openGraph: { title, description, type: "website" },
    };
  }

  const settings = await shopRouteGetSettingsForOwner(orgId);
  const pub = buildPublicStorefrontSettings(settings);
  const title = pub.seoDefaultTitle?.trim() || pub.storeName?.trim() || "Store";
  const description = pub.seoDefaultDescription?.trim() || undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      ...(pub.logoUrl?.trim() ? { images: [{ url: pub.logoUrl.trim() }] } : {}),
    },
  };
}

/**
 * Day 14 — Public storefront: domain → website → published page version → section registry.
 */
export default async function PublicShopPage({
  params,
  searchParams,
}: {
  params: Promise<{ segments?: string[] }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const segments = (await params).segments ?? [];
  const sp = searchParams ? await searchParams : {};
  const customizerIntroPreviewBridgeParentOrigin = customizerIntroPreviewBridgeOriginFromSearch(sp);
  const rawQ = sp?.q;
  const searchQuery = typeof rawQ === "string" ? rawQ : Array.isArray(rawQ) ? (rawQ[0] ?? "") : "";
  const legacyConceptParam = sp?.legacy_concept;
  const legacyConcept =
    legacyConceptParam === "1" ||
    legacyConceptParam === "true" ||
    (Array.isArray(legacyConceptParam) && (legacyConceptParam[0] === "1" || legacyConceptParam[0] === "true"));
  const path = segments.length ? `/${segments.join("/")}` : "/";

  const h = await headers();
  const hostRaw = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const hostname = storefrontHostnameForLookup(hostRaw);
  const requestAuthority = storefrontAuthorityForUrls(hostRaw);

  const domain = hostname ? await shopRouteFindDomainByHostname(hostname) : null;
  if (!domain?.website) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
        <p className="text-lg font-medium text-foreground">Storefront not configured</p>
        <p className="max-w-md text-sm">
          No active storefront domain matches <code className="rounded bg-muted px-1">{hostname || "(host)"}</code>.
          Attach a domain in Storefronts → Websites.
        </p>
      </div>
    );
  }

  const orgId = domain.website.organizationId;
  const websiteId = domain.website.id;
  /** Custom domain (phillywaterice.com): same shop as /shop, but URLs stay on the merchant host (no /shop prefix). */
  const customDomainRoot = Boolean(hostname && !isStorefrontAppHost(hostname));
  const sfPath = (segment: string) => joinStorefrontPublicPath(customDomainRoot, segment);

  const xfProto = h.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
  const protocol = xfProto === "http" ? "http:" : "https:";

  /** Commerce routes (Days 24–27) — resolved before CMS page payloads. */
  const seg = segments.map((s) => s.toLowerCase());
  /** Help KB stays on React-only chrome; blog uses full theme when a Liquid package is active. */
  const skipLiquidPrefetch = seg[0] === "help";

  const [settings, styleVars, liquidTheme, customizerContent, ownerCompany] = await Promise.all([
    shopRouteGetSettingsForOwner(orgId),
    shopRouteGetStorefrontThemeCssVars(orgId, websiteId).catch((e) => {
      console.warn("[shop] getStorefrontThemeCssVars failed:", e);
      return {} as Record<string, string>;
    }),
    skipLiquidPrefetch
      ? Promise.resolve(null)
      : shopRouteGetActiveShopifyLiquidTheme(orgId, websiteId).catch((e) => {
          console.warn("[shop] getActiveShopifyLiquidTheme failed:", e);
          return null;
        }),
    shopRouteGetStorefrontThemeCustomizerContent(orgId, websiteId).catch((e) => {
      console.warn("[shop] getStorefrontThemeCustomizerContent failed:", e);
      return null;
    }),
    prisma.user
      .findUnique({ where: { id: orgId }, select: { email: true, mobileNo: true } })
      .catch((e) => {
        console.warn("[shop] owner company contact lookup failed:", e);
        return null;
      }),
  ]);

  const publicSettings = buildPublicStorefrontSettings(settings);
  /** Storefront footer contact = the company that owns the store (Profile → email / mobile number). */
  const footerContact = buildStorefrontFooterContact(ownerCompany);

  if (publicSettings.maintenanceMode) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-8 text-center">
        <h1 className="text-2xl font-semibold">{publicSettings.storeName || "Store"}</h1>
        <p className="text-muted-foreground">We&apos;ll be back soon — this store is in maintenance mode.</p>
      </div>
    );
  }

  /** Theme links use Shopify paths (`/shop/account/login`, …); send shoppers to Paper Flight customer auth. */
  if (seg[0] === "account") {
    const wid = websiteId.toString();
    const qsParts: string[] = [];
    for (const [key, val] of Object.entries(sp)) {
      if (val === undefined) continue;
      const parts = Array.isArray(val) ? val : [val];
      for (const p of parts) {
        if (typeof p === "string" && p.length > 0) qsParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(p)}`);
      }
    }
    const qstr = qsParts.length > 0 ? `?${qsParts.join("&")}` : "";
    const sub = seg[1];
    if (sub === "register" || sub === "signup") {
      redirect(`/storefront/account/w/${wid}/signup${qstr}`);
    }
    if (sub === "recover" || sub === "forgot") {
      redirect(`/storefront/account/w/${wid}/forgot-password${qstr}`);
    }
    if (sub === "reset") {
      redirect(`/storefront/account/w/${wid}/reset-password${qstr}`);
    }
    /** `account`, `account/login`, and `account/dashboard` render below with theme chrome. */
  }

  const themeAssetRouteId =
    liquidTheme?.themeVersionId != null && liquidTheme.themeVersionId !== ""
      ? String(liquidTheme.themeVersionId)
      : undefined;
  const applyContentOverrides = (html: string) =>
    applyStorefrontFooterContactToHtml(
      applyThemeCustomizerContentToHtml(html, customizerContent, { themeAssetRouteId }),
      footerContact,
    );

  const prioritizeFeaturedProducts =
    customizerContent?.featuredProducts?.prioritizeFeaturedInHomeGrid === true;

  /**
   * Folded into the cached-home cache KEY (see `getCachedConceptHomeHtml`): any customizer / brand /
   * footer / theme-asset change re-renders the homepage immediately, while catalog data is cached.
   */
  const storefrontContentVersionInput = JSON.stringify({
    customizer: customizerContent ?? null,
    footer: footerContact ?? null,
    brand: publicSettings,
    prioritizeFeaturedProducts,
    themeAssetRouteId: themeAssetRouteId ?? null,
  });

  /** Theme customizer HTML, then replace the Concept flavor slider with live POS products (published + slug). */
  const hydrateConceptStaticHtml = async (
    rawHtml: string,
    bundleCatalog: PublicBundleCatalogProduct[] = [],
  ): Promise<string> => {
    let html = applyContentOverrides(rawHtml);
    try {
      const gridProducts = await listPublicProductsForConceptHomeGrid({
        organizationId: orgId,
        take: 12,
        prioritizeFeatured: prioritizeFeaturedProducts,
      });
      if (gridProducts.length > 0) {
        html = applyConceptHomeCatalogToHtml(html, gridProducts, {
          productPathPrefix: sfPath("products"),
        });
      }
    } catch (e) {
      console.warn("[shop] Concept home catalog hydrate failed:", e);
    }
    try {
      const featuredTabs = await listFeaturedTabsCollectionsForConceptHome(orgId, websiteId, {
        maxTabs: 50,
        maxProductsPerTab: 12,
      });
      if (featuredTabs.length > 0) {
        html = applyFeaturedCollectionsTabsToHtml(html, featuredTabs, {
          productPathPrefix: sfPath("products"),
        });
        html = applyShopMegaMenuFeaturedTabsToHtml(html, featuredTabs.slice(0, 8), {
          productPathPrefix: sfPath("products"),
          collectionPathPrefix: sfPath("collections"),
        });
      }
    } catch (e) {
      console.warn("[shop] Concept featured collections / shop mega-menu hydrate failed:", e);
    }
    try {
      const collectionRows = await listPublicStorefrontCollections(orgId, websiteId);
      if (collectionRows.length > 0) {
        html = applyCollectionsMegaMenuCardsToHtml(html, collectionRows, {
          collectionPathPrefix: sfPath("collections"),
          maxCollectionCards: 4,
        });
        html = applyCartDrawerEmptyCollectionsToHtml(html, collectionRows, {
          collectionPathPrefix: sfPath("collections"),
        });
      }
    } catch (e) {
      console.warn("[shop] Concept collections mega-menu hydrate failed:", e);
    }
    try {
      const latestStories = await listPublicBlogPostsForConceptLatestStories(orgId, websiteId, 3);
      if (latestStories.length > 0) {
        html = applyConceptLatestStoriesToHtml(html, latestStories, {
          postPathPrefix: sfPath("blog"),
          viewAllHref: sfPath("blog"),
        });
      }
    } catch (e) {
      console.warn("[shop] Concept latest stories hydrate failed:", e);
    }
    try {
      const spotlightProduct = await getPublicFeaturedSpotlightProduct(orgId);
      if (spotlightProduct) {
        html = applyFeaturedSpotlightCatalogToHtml(html, spotlightProduct, { productPathPrefix: sfPath("products") });
      }
    } catch (e) {
      console.warn("[shop] featured spotlight catalog hydrate failed:", e);
    }
    try {
      if (bundleCatalog.length > 0) {
        html = applyBundleCatalogToHtml(html, bundleCatalog, { productPathPrefix: sfPath("products") });
      }
    } catch (e) {
      console.warn("[shop] bundle section catalog hydrate failed:", e);
    }
    try {
      const events = await listPublishedEventsForPublicSection(orgId, websiteId, 12);
      if (events.length > 0) {
        html = applyConceptShopTheFeedEventsToHtml(html, events, {
          heading: "Upcoming Events",
          subtitle: "Catch us live — pop-ups, festivals, and tour dates near you.",
          viewAllHref: "/events",
          maxCards: 12,
        });
      }
    } catch (e) {
      console.warn("[shop] storefront events hydrate failed:", e);
    }
    html = stripPaperFlightUnsupportedConceptNav(html);
    return applyStorefrontBrandIdentityToHtml(html, publicSettings);
  };

  const cssVars = Object.entries(styleVars).reduce<Record<string, string>>((acc, [k, v]) => {
    acc[`--${k.replace(/[^a-zA-Z0-9-_]/g, "-")}`] = v;
    return acc;
  }, {});

  /** Day 44 — help center always uses the Next.js KB view (before Liquid hijacks unknown routes). */
  if (seg[0] === "help") {
    if (seg.length === 1) {
      const articles = await listHelpArticlesForStorefrontOrganization(orgId);
      return (
        <PublishedPageChrome
          style={cssVars as CSSProperties}
          publicSettings={publicSettings}
          title="Help center"
          websiteId={websiteId.toString()}
        >
          <PublicShopHelpHome publicSettings={publicSettings} articles={articles} />
        </PublishedPageChrome>
      );
    }
    if (seg[1] === "articles" && seg[2] && /^\d+$/.test(seg[2])) {
      const article = await getHelpArticleForStorefrontOrganization(orgId, BigInt(seg[2]));
      if (!article) notFound();
      return (
        <PublishedPageChrome
          style={cssVars as CSSProperties}
          publicSettings={publicSettings}
          title={article.title}
          websiteId={websiteId.toString()}
        >
          <PublicShopHelpArticle publicSettings={publicSettings} article={article} />
        </PublishedPageChrome>
      );
    }
    notFound();
  }

  if (seg[0] === "blog") {
    if (seg.length === 1) {
      const posts = await listPublicBlogPostsForShop(orgId, websiteId);
      if (liquidTheme) {
        try {
          const themeChromeHtml = await tryRenderStorefrontThemeChromeHtml({
            themeRoot: liquidTheme.themeRoot,
            themeVersionId: liquidTheme.themeVersionId,
            packageFile: liquidTheme.packageFile,
            protocol,
            requestAuthority,
            applyContentOverrides,
            contentVersionKey: storefrontContentVersionInput,
            publicSettings,
            organizationId: orgId,
            websiteId,
            customDomainRoot,
          });
          if (themeChromeHtml) {
            return (
              <StorefrontLiquidReactChrome
                html={themeChromeHtml}
                style={cssVars as CSSProperties}
                storefrontCurrency={publicSettings.currencyDisplay?.trim() || "USD"}
                customizerIntroPreviewBridgeParentOrigin={customizerIntroPreviewBridgeParentOrigin}
              >
                <PublicBlogListView
                  themeChrome
                  style={cssVars as CSSProperties}
                  publicSettings={publicSettings}
                  posts={posts}
                  websiteId={websiteId.toString()}
                />
              </StorefrontLiquidReactChrome>
            );
          }
        } catch (e) {
          console.warn("[shop] theme chrome for blog list failed:", e);
        }
      }
      return (
        <PublicBlogListView
          style={cssVars as CSSProperties}
          publicSettings={publicSettings}
          posts={posts}
          websiteId={websiteId.toString()}
        />
      );
    }
    if (seg.length === 2 && seg[1]) {
      const post = await getPublicBlogPostBySlug(orgId, websiteId, seg[1]!);
      if (!post) notFound();
      if (liquidTheme) {
        try {
          const themeChromeHtml = await tryRenderStorefrontThemeChromeHtml({
            themeRoot: liquidTheme.themeRoot,
            themeVersionId: liquidTheme.themeVersionId,
            packageFile: liquidTheme.packageFile,
            protocol,
            requestAuthority,
            applyContentOverrides,
            contentVersionKey: storefrontContentVersionInput,
            publicSettings,
            organizationId: orgId,
            websiteId,
            customDomainRoot,
          });
          if (themeChromeHtml) {
            return (
              <StorefrontLiquidReactChrome
                html={themeChromeHtml}
                style={cssVars as CSSProperties}
                storefrontCurrency={publicSettings.currencyDisplay?.trim() || "USD"}
                customizerIntroPreviewBridgeParentOrigin={customizerIntroPreviewBridgeParentOrigin}
              >
                <PublicBlogPostView
                  themeChrome
                  style={cssVars as CSSProperties}
                  publicSettings={publicSettings}
                  post={post}
                  websiteId={websiteId.toString()}
                />
              </StorefrontLiquidReactChrome>
            );
          }
        } catch (e) {
          console.warn("[shop] theme chrome for blog post failed:", e);
        }
      }
      return (
        <PublicBlogPostView
          style={cssVars as CSSProperties}
          publicSettings={publicSettings}
          post={post}
          websiteId={websiteId.toString()}
        />
      );
    }
    notFound();
  }

  /** Legacy event hash links (`/shop/pages/events#event-56`) redirect to `/events`. */
  if (seg[0] === "pages" && seg[1] === "events" && seg.length === 2) {
    return <EventsLegacyRedirect />;
  }

  /** Dedicated contact page — React layout (theme chrome when Liquid theme is active). */
  if (seg[0] === "pages" && seg[1] === "contact" && seg.length === 2) {
    if (liquidTheme) {
      try {
        const themeChromeHtml = await tryRenderStorefrontThemeChromeHtml({
          themeRoot: liquidTheme.themeRoot,
          themeVersionId: liquidTheme.themeVersionId,
          packageFile: liquidTheme.packageFile,
          protocol,
          requestAuthority,
          applyContentOverrides,
          contentVersionKey: storefrontContentVersionInput,
          publicSettings,
          organizationId: orgId,
          websiteId,
          customDomainRoot,
        });
        if (themeChromeHtml) {
          return (
            <StorefrontLiquidReactChrome
              html={themeChromeHtml}
              style={cssVars as CSSProperties}
              storefrontCurrency={publicSettings.currencyDisplay?.trim() || "USD"}
              customizerIntroPreviewBridgeParentOrigin={customizerIntroPreviewBridgeParentOrigin}
            >
              <PublicStorefrontContactPage
                themeChrome
                style={cssVars as CSSProperties}
                publicSettings={publicSettings}
                websiteId={websiteId.toString()}
              />
            </StorefrontLiquidReactChrome>
          );
        }
      } catch (e) {
        console.warn("[shop] theme chrome for contact failed:", e);
      }
    }
    return (
      <PublicStorefrontContactPage
        style={cssVars as CSSProperties}
        publicSettings={publicSettings}
        websiteId={websiteId.toString()}
      />
    );
  }

  /**
   * Shopify-packaged theme: full Liquid (layout + inner template) for supported URLs.
   * Checkout, cart, and catalog collection routes stay on React inside `StorefrontLiquidReactChrome`
   * so header/footer match the theme shell used on cart/checkout.
   */
  if (
    liquidTheme &&
    seg[0] !== "checkout" &&
    !(seg[0] === "cart" && seg.length === 1) &&
    seg[0] !== "collections"
  ) {
    /** Concept ZIP is a static HTML export: homepage serves `index.html` only — no Liquid engine. */
    if (isConceptThemePackageFile(liquidTheme.packageFile) && segments.length === 0) {
      /**
       * Full Concept homepage inside Next: same rewritten `index.html` as the static path (every section,
       * overlay drawers, footer, theme JS) via `StorefrontLiquidHtmlView`. Enable with `SHOP_CONCEPT_NEXT_HOME=1`.
       */
      const conceptNextHome = process.env.SHOP_CONCEPT_NEXT_HOME === "1" && !legacyConcept;
      if (conceptNextHome) {
        let conceptNextHtml: string | null = null;
        try {
          conceptNextHtml = await loadRewrittenConceptStorefrontIndexHtml(
            liquidTheme.themeRoot,
            BigInt(liquidTheme.themeVersionId),
            customDomainRoot,
          );
        } catch (e) {
          console.warn("[shop] Concept next home index.html load failed:", e);
        }
        if (conceptNextHtml) {
          const rawConceptNextHtml = conceptNextHtml;
          let bundleCatalog: PublicBundleCatalogProduct[] = [];
          try {
            bundleCatalog = await listPublicBundleCatalogProducts({ organizationId: orgId, websiteId });
          } catch (e) {
            console.warn("[shop] bundle catalog for Concept next home failed:", e);
          }
          const htmlOut = await getCachedConceptHomeHtml(
            {
              websiteId: websiteId.toString(),
              customDomainRoot,
              themeVersionId: themeAssetRouteId ?? "",
              contentHashInput: storefrontContentVersionInput,
              variant: "concept-next-home",
            },
            () => hydrateConceptStaticHtml(rawConceptNextHtml, bundleCatalog),
          );
          return (
            <StorefrontLiquidHtmlView
              html={htmlOut}
              style={cssVars as CSSProperties}
              storefrontCurrency={publicSettings.currencyDisplay?.trim() || "USD"}
              customizerIntroPreviewBridgeParentOrigin={customizerIntroPreviewBridgeParentOrigin}
              bundleCatalogProducts={bundleCatalog.length > 0 ? bundleCatalog : undefined}
            />
          );
        }
      }
      const fastHome = process.env.SHOP_FAST_HOME === "1" && !legacyConcept;
      if (fastHome) {
        let collections: Awaited<ReturnType<typeof listPublicStorefrontCollections>> = [];
        try {
          collections = await listPublicStorefrontCollections(orgId, websiteId);
        } catch (e) {
          console.warn("[shop] listPublicStorefrontCollections for fast home failed:", e);
        }
        return (
          <StorefrontConceptFastHome
            publicSettings={publicSettings}
            websiteId={websiteId.toString()}
            collections={collections}
            style={cssVars as CSSProperties}
          />
        );
      }
      let conceptHtml: string | null = null;
      try {
        conceptHtml = await loadRewrittenConceptStorefrontIndexHtml(
          liquidTheme.themeRoot,
          BigInt(liquidTheme.themeVersionId),
          customDomainRoot,
        );
      } catch (e) {
        console.warn("[shop] Concept static index.html load failed:", e);
      }
      if (conceptHtml) {
        const rawConceptHtml = conceptHtml;
        let bundleCatalog: PublicBundleCatalogProduct[] = [];
        try {
          bundleCatalog = await listPublicBundleCatalogProducts({ organizationId: orgId, websiteId });
        } catch (e) {
          console.warn("[shop] bundle catalog for Concept static home failed:", e);
        }
        const htmlOut = await getCachedConceptHomeHtml(
          {
            websiteId: websiteId.toString(),
            customDomainRoot,
            themeVersionId: themeAssetRouteId ?? "",
            contentHashInput: storefrontContentVersionInput,
            variant: "concept-static-home",
          },
          () => hydrateConceptStaticHtml(rawConceptHtml, bundleCatalog),
        );
        return (
          <StorefrontLiquidHtmlView
            html={htmlOut}
            style={cssVars as CSSProperties}
            storefrontCurrency={publicSettings.currencyDisplay?.trim() || "USD"}
            customizerIntroPreviewBridgeParentOrigin={customizerIntroPreviewBridgeParentOrigin}
            bundleCatalogProducts={bundleCatalog.length > 0 ? bundleCatalog : undefined}
          />
        );
      }
    }

    let productsCount = 0;
    try {
      productsCount = await prisma.posProduct.count({
        where: { organizationId: orgId, ...storefrontProductPublicLiveWhere() },
      });
    } catch (e) {
      console.warn("[shop] posProduct.count for Liquid storefront failed (schema or DB); using 0.", e);
    }
    let product = null as Awaited<ReturnType<typeof getPublicProductBySlug>> | null;
    if (seg[0] === "products" && seg[1]) {
      try {
        product = await getPublicProductBySlug(orgId, seg[1]!);
      } catch (e) {
        console.warn("[shop] getPublicProductBySlug (Liquid) failed:", e);
      }
    }
    let cmsPageLiquid: Awaited<ReturnType<typeof getPublishedPageLiquidDrop>> = null;
    if (seg[0] === "pages" && seg[1]) {
      try {
        cmsPageLiquid = await getPublishedPageLiquidDrop(orgId, websiteId, path);
      } catch (e) {
        console.warn("[shop] getPublishedPageLiquidDrop failed:", e);
      }
    }
    let bundleCatalogLiquid: PublicBundleCatalogProduct[] = [];
    if (segments.length === 0) {
      try {
        bundleCatalogLiquid = await listPublicBundleCatalogProducts({ organizationId: orgId, websiteId });
      } catch (e) {
        console.warn("[shop] bundle catalog for Liquid storefront home failed:", e);
      }
    }

    const liquid = await tryRenderShopifyLiquidStorefront({
      themeRoot: liquidTheme.themeRoot,
      themeVersionId: liquidTheme.themeVersionId,
      protocol,
      requestAuthority,
      requestPath: path,
      segments,
      settingsBrand: publicSettings,
      productsCount,
      product,
      collection: null,
      cmsPageLiquid,
      searchQuery,
      organizationId: orgId,
      websiteId,
      customDomainRoot,
    });
    if (liquid) {
      let liquidHtml = applyStorefrontBrandIdentityToHtml(applyContentOverrides(liquid.html), publicSettings);
      if (bundleCatalogLiquid.length > 0) {
        try {
          liquidHtml = applyBundleCatalogToHtml(liquidHtml, bundleCatalogLiquid, {
            productPathPrefix: sfPath("products"),
          });
        } catch (e) {
          console.warn("[shop] bundle section hydrate on Liquid HTML failed:", e);
        }
      }
      return (
        <StorefrontLiquidHtmlView
          html={liquidHtml}
          style={cssVars as CSSProperties}
          storefrontCurrency={publicSettings.currencyDisplay?.trim() || "USD"}
          customizerIntroPreviewBridgeParentOrigin={customizerIntroPreviewBridgeParentOrigin}
          bundleCatalogProducts={bundleCatalogLiquid.length > 0 ? bundleCatalogLiquid : undefined}
        />
      );
    }
    if (segments.length === 0) {
      return <ShopLiquidThemeHomeFallback host={requestAuthority} packageFile={liquidTheme.packageFile} />;
    }
  }

  if (seg[0] === "products" && seg[1]) {
    const product = await getPublicProductBySlug(orgId, seg[1]!);
    if (!product) notFound();
    if (liquidTheme) {
      try {
        const themeChromeHtml = await tryRenderStorefrontThemeChromeHtml({
          themeRoot: liquidTheme.themeRoot,
          themeVersionId: liquidTheme.themeVersionId,
          packageFile: liquidTheme.packageFile,
          protocol,
          requestAuthority,
          applyContentOverrides,
          contentVersionKey: storefrontContentVersionInput,
          publicSettings,
          organizationId: orgId,
          websiteId,
          customDomainRoot,
        });
        if (themeChromeHtml) {
          return (
            <StorefrontLiquidReactChrome
              html={themeChromeHtml}
              style={cssVars as CSSProperties}
              storefrontCurrency={publicSettings.currencyDisplay?.trim() || "USD"}
              customizerIntroPreviewBridgeParentOrigin={customizerIntroPreviewBridgeParentOrigin}
            >
              <PublicProductView
                themeChrome
                style={cssVars as CSSProperties}
                product={product}
                publicSettings={publicSettings}
                websiteId={websiteId.toString()}
              />
            </StorefrontLiquidReactChrome>
          );
        }
      } catch (e) {
        console.warn("[shop] theme chrome for product failed:", e);
      }
    }
    return (
      <PublicProductView
        style={cssVars as CSSProperties}
        product={product}
        publicSettings={publicSettings}
        websiteId={websiteId.toString()}
      />
    );
  }
  if (seg[0] === "collections" && seg.length === 1) {
    let collectionRows: Awaited<ReturnType<typeof listPublicStorefrontCollections>> = [];
    try {
      collectionRows = await listPublicStorefrontCollections(orgId, websiteId);
    } catch (e) {
      console.warn("[shop] listPublicStorefrontCollections (index) failed:", e);
    }
    if (liquidTheme) {
      try {
        const themeChromeHtml = await tryRenderStorefrontThemeChromeHtml({
          themeRoot: liquidTheme.themeRoot,
          themeVersionId: liquidTheme.themeVersionId,
          packageFile: liquidTheme.packageFile,
          protocol,
          requestAuthority,
          applyContentOverrides,
          contentVersionKey: storefrontContentVersionInput,
          publicSettings,
          organizationId: orgId,
          websiteId,
          customDomainRoot,
        });
        if (themeChromeHtml) {
          return (
            <StorefrontLiquidReactChrome
              html={themeChromeHtml}
              style={cssVars as CSSProperties}
              storefrontCurrency={publicSettings.currencyDisplay?.trim() || "USD"}
              customizerIntroPreviewBridgeParentOrigin={customizerIntroPreviewBridgeParentOrigin}
            >
              <PublicCollectionsListView
                themeChrome
                style={cssVars as CSSProperties}
                collections={collectionRows}
                publicSettings={publicSettings}
                websiteId={websiteId.toString()}
              />
            </StorefrontLiquidReactChrome>
          );
        }
      } catch (e) {
        console.warn("[shop] theme chrome for collections index failed:", e);
      }
    }
    return (
      <PublicCollectionsListView
        style={cssVars as CSSProperties}
        collections={collectionRows}
        publicSettings={publicSettings}
        websiteId={websiteId.toString()}
      />
    );
  }
  if (seg[0] === "collections" && seg[1]) {
    const collection = await getPublicCollectionBySlug(orgId, websiteId, seg[1]!);
    if (!collection) notFound();
    if (liquidTheme) {
      try {
        const themeChromeHtml = await tryRenderStorefrontThemeChromeHtml({
          themeRoot: liquidTheme.themeRoot,
          themeVersionId: liquidTheme.themeVersionId,
          packageFile: liquidTheme.packageFile,
          protocol,
          requestAuthority,
          applyContentOverrides,
          contentVersionKey: storefrontContentVersionInput,
          publicSettings,
          organizationId: orgId,
          websiteId,
          customDomainRoot,
        });
        if (themeChromeHtml) {
          return (
            <StorefrontLiquidReactChrome
              html={themeChromeHtml}
              style={cssVars as CSSProperties}
              storefrontCurrency={publicSettings.currencyDisplay?.trim() || "USD"}
              customizerIntroPreviewBridgeParentOrigin={customizerIntroPreviewBridgeParentOrigin}
            >
              <PublicCollectionView
                themeChrome
                style={cssVars as CSSProperties}
                collection={collection}
                publicSettings={publicSettings}
                websiteId={websiteId.toString()}
              />
            </StorefrontLiquidReactChrome>
          );
        }
      } catch (e) {
        console.warn("[shop] theme chrome for collection failed:", e);
      }
    }
    return (
      <PublicCollectionView
        style={cssVars as CSSProperties}
        collection={collection}
        publicSettings={publicSettings}
        websiteId={websiteId.toString()}
      />
    );
  }
  if (seg[0] === "cart" && seg.length === 1) {
    if (liquidTheme) {
      try {
        const themeChromeHtml = await tryRenderStorefrontThemeChromeHtml({
          themeRoot: liquidTheme.themeRoot,
          themeVersionId: liquidTheme.themeVersionId,
          packageFile: liquidTheme.packageFile,
          protocol,
          requestAuthority,
          applyContentOverrides,
          contentVersionKey: storefrontContentVersionInput,
          publicSettings,
          organizationId: orgId,
          websiteId,
          customDomainRoot,
        });
        if (themeChromeHtml) {
          return (
            <StorefrontLiquidReactChrome
              html={themeChromeHtml}
              style={cssVars as CSSProperties}
              storefrontCurrency={publicSettings.currencyDisplay?.trim() || "USD"}
              customizerIntroPreviewBridgeParentOrigin={customizerIntroPreviewBridgeParentOrigin}
            >
              <PublicCartClient
                themeChrome
                style={cssVars as CSSProperties}
                publicSettings={publicSettings}
                websiteId={websiteId.toString()}
              />
            </StorefrontLiquidReactChrome>
          );
        }
      } catch (e) {
        console.warn("[shop] theme chrome for cart failed:", e);
      }
    }
    return (
      <PublicCartClient
        style={cssVars as CSSProperties}
        publicSettings={publicSettings}
        websiteId={websiteId.toString()}
      />
    );
  }
  if (seg[0] === "checkout" && seg.length === 1) {
    if (liquidTheme) {
      try {
        const themeChromeHtml = await tryRenderStorefrontThemeChromeHtml({
          themeRoot: liquidTheme.themeRoot,
          themeVersionId: liquidTheme.themeVersionId,
          packageFile: liquidTheme.packageFile,
          protocol,
          requestAuthority,
          applyContentOverrides,
          contentVersionKey: storefrontContentVersionInput,
          publicSettings,
          organizationId: orgId,
          websiteId,
          customDomainRoot,
        });
        if (themeChromeHtml) {
          return (
            <StorefrontLiquidReactChrome
              html={themeChromeHtml}
              style={cssVars as CSSProperties}
              storefrontCurrency={publicSettings.currencyDisplay?.trim() || "USD"}
              customizerIntroPreviewBridgeParentOrigin={customizerIntroPreviewBridgeParentOrigin}
            >
              <PublicCheckoutClient
                themeChrome
                style={cssVars as CSSProperties}
                publicSettings={publicSettings}
                websiteId={websiteId.toString()}
                publicAccountPath={sfPath("account")}
              />
            </StorefrontLiquidReactChrome>
          );
        }
      } catch (e) {
        console.warn("[shop] theme chrome for checkout failed:", e);
      }
    }
    return (
      <PublicCheckoutClient
        style={cssVars as CSSProperties}
        publicSettings={publicSettings}
        websiteId={websiteId.toString()}
        publicAccountPath={sfPath("account")}
      />
    );
  }

  if (seg[0] === "account" && seg[1] === "login") {
    const wid = websiteId.toString();
    const accountCtx = await getStorefrontCustomerSessionForWebsite(wid);
    if (accountCtx) {
      redirect(sfPath("account"));
    }
    const loginInner = (
      <Suspense fallback={<p className="px-4 py-12 text-sm text-neutral-600">Loading…</p>}>
        <StorefrontAccountLoginClient
          themeChrome={Boolean(liquidTheme)}
          style={cssVars as CSSProperties}
          websiteId={wid}
          publicAccountPath={sfPath("account")}
        />
      </Suspense>
    );
    if (liquidTheme) {
      try {
        const themeChromeHtml = await tryRenderStorefrontThemeChromeHtml({
          themeRoot: liquidTheme.themeRoot,
          themeVersionId: liquidTheme.themeVersionId,
          packageFile: liquidTheme.packageFile,
          protocol,
          requestAuthority,
          applyContentOverrides,
          contentVersionKey: storefrontContentVersionInput,
          publicSettings,
          organizationId: orgId,
          websiteId,
          customDomainRoot,
        });
        if (themeChromeHtml) {
          return (
            <StorefrontLiquidReactChrome
              html={themeChromeHtml}
              style={cssVars as CSSProperties}
              storefrontCurrency={publicSettings.currencyDisplay?.trim() || "USD"}
              customizerIntroPreviewBridgeParentOrigin={customizerIntroPreviewBridgeParentOrigin}
            >
              {loginInner}
            </StorefrontLiquidReactChrome>
          );
        }
      } catch (e) {
        console.warn("[shop] theme chrome for account login failed:", e);
      }
    }
    return loginInner;
  }

  if (seg[0] === "account" && (!seg[1] || seg[1] === "dashboard")) {
    const wid = websiteId.toString();
    const accountCtx = await getStorefrontCustomerSessionForWebsite(wid);
    if (!accountCtx) {
      redirect(`${sfPath("account/login")}?next=${encodeURIComponent(sfPath("account"))}`);
    }
    const accountInner = (
      <StorefrontAccountDashboardClient
        themeChrome={Boolean(liquidTheme)}
        style={cssVars as CSSProperties}
        websiteId={wid}
        email={accountCtx.email}
        name={accountCtx.name}
        publicAccountPath={sfPath("account")}
      />
    );
    if (liquidTheme) {
      try {
        const themeChromeHtml = await tryRenderStorefrontThemeChromeHtml({
          themeRoot: liquidTheme.themeRoot,
          themeVersionId: liquidTheme.themeVersionId,
          packageFile: liquidTheme.packageFile,
          protocol,
          requestAuthority,
          applyContentOverrides,
          contentVersionKey: storefrontContentVersionInput,
          publicSettings,
          organizationId: orgId,
          websiteId,
          customDomainRoot,
        });
        if (themeChromeHtml) {
          return (
            <StorefrontLiquidReactChrome
              html={themeChromeHtml}
              style={cssVars as CSSProperties}
              storefrontCurrency={publicSettings.currencyDisplay?.trim() || "USD"}
              customizerIntroPreviewBridgeParentOrigin={customizerIntroPreviewBridgeParentOrigin}
            >
              {accountInner}
            </StorefrontLiquidReactChrome>
          );
        }
      } catch (e) {
        console.warn("[shop] theme chrome for account failed:", e);
      }
    }
    return accountInner;
  }

  let payload: Awaited<ReturnType<typeof getPublishedShopPagePayload>> = null;
  try {
    payload = await getPublishedShopPagePayload(orgId, websiteId, path);
  } catch (e) {
    console.error("[shop] getPublishedShopPagePayload failed:", e);
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-8 text-center text-muted-foreground">
        <p className="text-lg font-medium text-foreground">Store page could not be loaded</p>
        <p className="max-w-md text-sm">
          Check PM2 / server logs for database errors. Run{" "}
          <code className="rounded bg-muted px-1 text-xs">npm run db:migrate:deploy</code> in the Next.js app if Prisma reports missing columns.
        </p>
      </div>
    );
  }
  if (!payload) {
    notFound();
  }

  return <PublishedPageView data={payload} />;
}
