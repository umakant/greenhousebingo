/**
 * Computes live checklist completion from Prisma (derived steps) plus `Website.metadata.setup`
 * flags for merchant-confirmed items until catalog/checkout APIs auto-detect them.
 */
import type { PrismaClient } from "@prisma/client";

import { DOMAIN_STATUS, VERSION_STATUS, WEBSITE_STATUS } from "@/lib/storefront/constants";
import { parseStorefrontWebsiteSetup } from "@/lib/storefront/setup-metadata";
import {
  STOREFRONT_SETUP_STEP_DEF,
  STOREFRONT_SETUP_STEP_IDS,
  isManualStorefrontSetupStep,
  type StorefrontSetupStepId,
  type StorefrontSetupStepSnapshot,
} from "@/lib/storefront/setup-types";

export type StorefrontSetupOverviewPayload = {
  organizationId: string | null;
  websites: { id: string; name: string; slug: string; status: string }[];
  focusWebsiteId: string | null;
  steps: StorefrontSetupStepSnapshot[];
  completedCount: number;
  total: number;
  percent: number;
};

function pickFocusWebsiteId(
  websites: { id: bigint }[],
  requested: bigint | undefined,
): bigint | null {
  if (websites.length === 0) return null;
  if (requested != null && websites.some((w) => w.id === requested)) return requested;
  return websites[0].id;
}

async function hasPublishedHomepage(
  prisma: PrismaClient,
  organizationId: bigint,
  websiteId: bigint,
): Promise<boolean> {
  const pages = await prisma.page.findMany({
    where: {
      organizationId,
      websiteId,
      OR: [
        { slug: { equals: "index", mode: "insensitive" } },
        { slug: { equals: "home", mode: "insensitive" } },
      ],
      status: { not: "archived" },
    },
    select: {
      id: true,
      versions: {
        where: { status: VERSION_STATUS.PUBLISHED },
        take: 1,
        select: { id: true },
      },
    },
  });
  return pages.some((p) => p.versions.length > 0);
}

async function hasThemeSelected(
  prisma: PrismaClient,
  organizationId: bigint,
  websiteId: bigint,
): Promise<boolean> {
  const theme = await prisma.theme.findFirst({
    where: {
      organizationId,
      websiteId,
      status: { not: "archived" },
    },
    select: {
      id: true,
      status: true,
      versions: {
        where: { status: VERSION_STATUS.PUBLISHED },
        take: 1,
        select: { id: true },
      },
    },
  });
  if (!theme) return false;
  if (theme.status === "active") return true;
  return theme.versions.length > 0;
}

/**
 * Computes checklist completion for one organization and optional focus website.
 * Safe to call from RSC or API routes (pass shared prisma).
 */
export async function computeStorefrontSetupOverview(
  prisma: PrismaClient,
  organizationId: bigint,
  options?: { focusWebsiteId?: bigint },
): Promise<StorefrontSetupOverviewPayload> {
  const websites = await prisma.website.findMany({
    where: { organizationId, status: { not: WEBSITE_STATUS.SUSPENDED } },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, slug: true, status: true, metadata: true },
  });

  const focusId = pickFocusWebsiteId(websites, options?.focusWebsiteId);
  const focusRow = focusId ? websites.find((w) => w.id === focusId) : undefined;
  const setup = parseStorefrontWebsiteSetup(focusRow?.metadata);

  const websiteCreated = websites.length > 0;

  let domainAttached = false;
  let themeSelected = false;
  let homepagePublished = false;

  if (focusId) {
    const domainCount = await prisma.domain.count({
      where: {
        organizationId,
        websiteId: focusId,
        status: { not: DOMAIN_STATUS.DISABLED },
      },
    });
    domainAttached = domainCount > 0;
    themeSelected = await hasThemeSelected(prisma, organizationId, focusId);
    homepagePublished = await hasPublishedHomepage(prisma, organizationId, focusId);
  }

  const completionById: Record<StorefrontSetupStepId, boolean> = {
    website_created: websiteCreated,
    domain_attached: domainAttached,
    theme_selected: themeSelected,
    homepage_published: homepagePublished,
    first_product_created: setup.firstProductCreated,
    payment_configured: setup.paymentConfigured,
    shipping_configured: setup.shippingConfigured,
    taxes_configured: setup.taxesConfigured,
    customer_accounts_enabled: setup.customerAccountsEnabled,
  };

  const steps: StorefrontSetupStepSnapshot[] = STOREFRONT_SETUP_STEP_IDS.map((id) => {
    const def = STOREFRONT_SETUP_STEP_DEF[id];
    const manual = isManualStorefrontSetupStep(id);
    return {
      ...def,
      completed: completionById[id],
      source: manual ? "manual" : "derived",
    };
  });

  const completedCount = steps.filter((s) => s.completed).length;
  const total = steps.length;
  const percent = total === 0 ? 0 : Math.round((completedCount / total) * 100);

  return {
    organizationId: organizationId.toString(),
    websites: websites.map((w) => ({
      id: w.id.toString(),
      name: w.name,
      slug: w.slug,
      status: w.status,
    })),
    focusWebsiteId: focusId?.toString() ?? null,
    steps,
    completedCount,
    total,
    percent,
  };
}
