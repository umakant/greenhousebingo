import type { Prisma } from "@prisma/client";
import fs from "fs/promises";
import path from "path";

import { prisma } from "@/lib/prisma";
import {
  liquidThemeExtractRoot,
  resolveThemeExtractRootPath,
} from "@/lib/storefront/liquid/extract-shopify-theme";
import type { ThemeCustomizerContentState } from "@/lib/storefront/theme-customizer-content";
import { loadThemeCssVariableTokens } from "@/lib/storefront/theme-css-variables";
import { logStorefrontAudit, STOREFRONT_AUDIT_EVENTS } from "@/lib/storefront/storefront-audit";

type DbClient = Prisma.TransactionClient | typeof prisma;

async function clearWebsitesActiveThemeIfPointingAt(
  tx: DbClient,
  organizationId: bigint,
  themeId: bigint,
): Promise<bigint[]> {
  const affected: bigint[] = [];
  const tid = themeId.toString();
  const sites = await tx.website.findMany({
    where: { organizationId },
    select: { id: true, metadata: true },
  });
  for (const w of sites) {
    const meta =
      w.metadata && typeof w.metadata === "object" && !Array.isArray(w.metadata)
        ? { ...(w.metadata as Record<string, unknown>) }
        : {};
    if (String(meta.activeThemeId ?? "") !== tid) continue;
    affected.push(w.id);
    delete meta.activeThemeId;
    delete meta.activeThemeVersionId;
    delete meta.shopifyLiquidPackageFile;
    await tx.website.update({
      where: { id: w.id },
      data: { metadata: meta as object },
    });
  }
  return affected;
}

async function removeLiquidThemeExtractDirs(organizationId: bigint, versionIds: bigint[]): Promise<void> {
  if (versionIds.length === 0) return;
  const [{ liquidThemeExtractRoot }, fs] = await Promise.all([
    import("@/lib/storefront/liquid/extract-shopify-theme"),
    import("fs/promises"),
  ]);
  for (const vid of versionIds) {
    const root = liquidThemeExtractRoot(organizationId, vid);
    await fs.rm(root, { recursive: true, force: true }).catch(() => {});
  }
}

export async function listThemesForOrganization(organizationId: bigint, websiteId?: bigint) {
  const rows = await prisma.theme.findMany({
    where: {
      organizationId,
      ...(websiteId != null ? { websiteId } : {}),
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      websiteId: true,
      sourceTemplateId: true,
      metadata: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { versions: true } },
    },
  });

  const sites = await prisma.website.findMany({
    where: { organizationId },
    select: { id: true, metadata: true },
  });
  const liveThemeIdByWebsite = new Map<string, string>();
  for (const w of sites) {
    const meta =
      w.metadata && typeof w.metadata === "object" && !Array.isArray(w.metadata)
        ? (w.metadata as Record<string, unknown>)
        : {};
    const tid = meta.activeThemeId;
    if (tid != null && String(tid).trim() !== "") {
      liveThemeIdByWebsite.set(w.id.toString(), String(tid));
    }
  }

  return rows.map((t) => ({
    ...t,
    isStorefrontLive:
      t.websiteId != null && liveThemeIdByWebsite.get(t.websiteId.toString()) === t.id.toString(),
  }));
}

/** Install a tenant theme from a global or org-visible ThemeTemplate (Day 12+). */
export async function createThemeFromTemplate(
  organizationId: bigint,
  templateId: bigint,
  websiteId: bigint | null | undefined,
  actorUserId: bigint | null,
  saas?: { actorEmail?: string | null; actorRole?: string | null; path?: string | null },
) {
  if (websiteId != null) {
    const w = await prisma.website.findFirst({
      where: { id: websiteId, organizationId },
      select: { id: true },
    });
    if (!w) throw new Error("Website not found.");
  }

  const template = await prisma.themeTemplate.findFirst({
    where: {
      id: templateId,
      OR: [{ organizationId: null }, { organizationId }],
      status: { not: "archived" },
    },
  });
  if (!template) throw new Error("Theme template not found.");

  const slugBase = template.slug;
  let slug = slugBase;
  let n = 0;
  while (await prisma.theme.findFirst({ where: { organizationId, slug } })) {
    n += 1;
    slug = `${slugBase}-${n}`;
  }

  const theme = await prisma.theme.create({
    data: {
      organizationId,
      websiteId: websiteId ?? null,
      sourceTemplateId: template.id,
      name: template.name,
      slug,
      status: "draft",
      metadata:
        template.metadata && typeof template.metadata === "object" && !Array.isArray(template.metadata)
          ? (template.metadata as object)
          : undefined,
      createdById: actorUserId ?? undefined,
    },
  });

  const version = await prisma.themeVersion.create({
    data: {
      organizationId,
      themeId: theme.id,
      version: 1,
      label: "v1",
      status: "draft",
      createdById: actorUserId ?? undefined,
    },
  });

  await logStorefrontAudit({
    organizationId,
    websiteId: websiteId ?? undefined,
    eventType: STOREFRONT_AUDIT_EVENTS.THEME_CREATE,
    actorUserId,
    resourceType: "theme",
    resourceId: theme.id.toString(),
    message: `Theme created from template: ${template.name}`,
    metadata: {
      templateId: templateId.toString(),
      themeVersionId: version.id.toString(),
      slug: theme.slug,
    },
    saas,
  });

  const tmplMeta = template.metadata as Record<string, unknown> | null;
  if (tmplMeta?.kind === "shopify_zip" && typeof tmplMeta.packageFile === "string") {
    try {
      const { extractStyleTokensFromShopifyThemeZip } = await import("@/lib/storefront/shopify-zip-theme");
      const tokens = await extractStyleTokensFromShopifyThemeZip(tmplMeta.packageFile);
      if (tokens.length > 0) {
        await replaceThemeVersionStyleTokens(organizationId, theme.id, version.id, tokens, actorUserId, saas);
      }
    } catch (e) {
      console.warn("[theme-service] Shopify theme ZIP style extraction failed:", e);
    }
  }

  return { theme, version };
}

export async function getThemeWithLatestVersion(organizationId: bigint, themeId: bigint) {
  return prisma.theme.findFirst({
    where: { id: themeId, organizationId },
    include: {
      versions: {
        orderBy: { version: "desc" },
        take: 1,
        include: {
          sectionDefinitions: { orderBy: { sortOrder: "asc" } },
          styleTokens: { orderBy: { tokenKey: "asc" } },
        },
      },
    },
  });
}

/** Marks a theme version as the active published snapshot and records audit (Day 12 / 18). */
export async function activateThemeVersion(
  organizationId: bigint,
  themeId: bigint,
  themeVersionId: bigint,
  websiteId: bigint | null,
  actorUserId: bigint | null,
  saas?: { actorEmail?: string | null; actorRole?: string | null; path?: string | null },
) {
  const tv = await prisma.themeVersion.findFirst({
    where: { id: themeVersionId, themeId, organizationId },
    include: { theme: { select: { id: true, name: true, slug: true, metadata: true, websiteId: true } } },
  });
  if (!tv) {
    throw new Error("Theme version not found.");
  }

  /** `/shop` reads active version from **Website.metadata** — must never be skipped for a null websiteId. */
  let effectiveWebsiteId: bigint | null = websiteId ?? tv.theme.websiteId ?? null;
  if (effectiveWebsiteId == null) {
    const candidates = await prisma.website.findMany({
      where: { organizationId },
      select: { id: true },
      orderBy: { id: "asc" },
      take: 2,
    });
    if (candidates.length === 1) {
      effectiveWebsiteId = candidates[0]!.id;
    }
  }

  const demoteOthers =
    effectiveWebsiteId != null
      ? prisma.theme.updateMany({
          where: {
            organizationId,
            id: { not: themeId },
            status: "active",
            websiteId: effectiveWebsiteId,
          },
          data: { status: "draft" },
        })
      : null;

  await prisma.$transaction([
    prisma.themeVersion.updateMany({
      where: { themeId, organizationId, status: "published" },
      data: { status: "archived" },
    }),
    prisma.themeVersion.update({
      where: { id: themeVersionId },
      data: { status: "published", publishedAt: new Date() },
    }),
    prisma.theme.update({
      where: { id: themeId },
      data: {
        status: "active",
        ...(websiteId != null ? { websiteId } : effectiveWebsiteId != null ? { websiteId: effectiveWebsiteId } : {}),
        updatedById: actorUserId ?? undefined,
      },
    }),
    ...(demoteOthers ? [demoteOthers] : []),
  ]);

  const thMetaForZip = tv.theme.metadata as Record<string, unknown> | null;
  const shopifyZipPackage =
    thMetaForZip?.kind === "shopify_zip" && typeof thMetaForZip.packageFile === "string"
      ? String(thMetaForZip.packageFile).trim()
      : "";

  if (effectiveWebsiteId != null) {
    const site = await prisma.website.findFirst({
      where: { id: effectiveWebsiteId, organizationId },
      select: { id: true, metadata: true },
    });
    if (site) {
      const meta =
        site.metadata && typeof site.metadata === "object" && !Array.isArray(site.metadata)
          ? { ...(site.metadata as Record<string, unknown>) }
          : {};
      meta.activeThemeId = themeId.toString();
      meta.activeThemeVersionId = themeVersionId.toString();
      if (shopifyZipPackage) {
        /** `/shop` Liquid reads ZIP from the website row — no ThemeVersion needed for extract path. */
        meta.shopifyLiquidPackageFile = shopifyZipPackage;
      } else {
        delete meta.shopifyLiquidPackageFile;
      }
      await prisma.website.update({
        where: { id: effectiveWebsiteId },
        data: { metadata: meta as object },
      });
    }
  }

  await logStorefrontAudit({
    organizationId,
    websiteId: effectiveWebsiteId ?? undefined,
    eventType: STOREFRONT_AUDIT_EVENTS.THEME_ACTIVATE,
    actorUserId,
    resourceType: "theme_version",
    resourceId: themeVersionId.toString(),
    message: `Theme activated: ${tv.theme.name} v${tv.version}`,
    metadata: { themeId: themeId.toString(), themeVersionId: themeVersionId.toString() },
    saas,
  });

  if (effectiveWebsiteId != null) {
    const { extractShopifyThemeZipForWebsite, removeLiquidWebsiteStorefrontDir } = await import(
      "@/lib/storefront/liquid/extract-shopify-theme"
    );
    if (shopifyZipPackage) {
      try {
        await extractShopifyThemeZipForWebsite(organizationId, effectiveWebsiteId, shopifyZipPackage);
      } catch (e) {
        console.warn("[theme-service] Shopify theme extract for Liquid (website) failed:", e);
      }
    } else {
      await removeLiquidWebsiteStorefrontDir(organizationId, effectiveWebsiteId);
    }
  }
}

export { resolveThemeExtractRootPath };

/**
 * Reads `assets/styles/index-head.css` (or fallbacks) from the extracted theme and replaces DB tokens.
 * Call after the theme ZIP has been extracted (publish / first `/shop` hit).
 */
export async function seedThemeVersionStyleTokensFromThemeFiles(
  organizationId: bigint,
  themeId: bigint,
  themeVersionId: bigint,
  actorUserId: bigint | null,
  saas?: { actorEmail?: string | null; actorRole?: string | null; path?: string | null },
): Promise<{ count: number }> {
  const tv = await prisma.themeVersion.findFirst({
    where: { id: themeVersionId, themeId, organizationId },
    include: { theme: { select: { websiteId: true } } },
  });
  if (!tv) {
    throw new Error("Theme version not found.");
  }
  const themeRoot = await resolveThemeExtractRootPath(organizationId, tv.theme.websiteId, themeVersionId);
  if (!themeRoot) {
    throw new Error(
      "Theme files are not on this server yet. Publish the theme or open the live storefront once, then try again.",
    );
  }
  const parsed = await loadThemeCssVariableTokens(themeRoot);
  if (parsed.length === 0) {
    throw new Error("No CSS variables found in the theme. Expected assets/styles/index-head.css with a :root block.");
  }
  const tokens = parsed.map((p) => ({
    tokenKey: p.tokenKey,
    value: p.value,
    groupName: p.groupName,
  }));
  await replaceThemeVersionStyleTokens(organizationId, themeId, themeVersionId, tokens, actorUserId, saas);
  return { count: tokens.length };
}

/**
 * `/shop` reads style tokens and customizer overrides from `ThemeVersion` via
 * `Website.metadata.activeThemeVersionId`. After saving from the admin, keep that pointer aligned with the
 * row we updated when either:
 * - the website already points at this theme (`activeThemeId`), or
 * - this theme is bound to the website (`Theme.websiteId`) but `activeThemeId` was never set (common after
 *   imports / older flows) — otherwise Publish writes to the edited version while `/shop` still reads another.
 */
async function syncWebsiteActiveThemeVersionForLiveTheme(
  organizationId: bigint,
  themeId: bigint,
  themeVersionId: bigint,
): Promise<void> {
  const tid = themeId.toString();
  const vid = themeVersionId.toString();
  const theme = await prisma.theme.findFirst({
    where: { id: themeId, organizationId },
    select: { websiteId: true },
  });
  const boundWebsiteId = theme?.websiteId ?? null;

  const websites = await prisma.website.findMany({
    where: { organizationId },
    select: { id: true, metadata: true },
  });
  for (const w of websites) {
    const meta =
      w.metadata && typeof w.metadata === "object" && !Array.isArray(w.metadata)
        ? ({ ...(w.metadata as Record<string, unknown>) } as Record<string, unknown>)
        : {};
    const boundMatch = boundWebsiteId != null && w.id === boundWebsiteId;
    const pointerMatch = String(meta.activeThemeId ?? "") === tid;
    if (!boundMatch && !pointerMatch) continue;

    let changed = false;
    if (boundMatch && String(meta.activeThemeId ?? "") !== tid) {
      meta.activeThemeId = tid;
      changed = true;
    }
    if (String(meta.activeThemeVersionId ?? "") !== vid) {
      meta.activeThemeVersionId = vid;
      changed = true;
    }
    if (!changed) continue;

    await prisma.website.update({
      where: { id: w.id },
      data: { metadata: meta as object },
    });
  }
}

/** Replaces all style tokens for a theme version (Day 18). */
export async function replaceThemeVersionStyleTokens(
  organizationId: bigint,
  themeId: bigint,
  themeVersionId: bigint,
  tokens: Array<{ tokenKey: string; value: string; groupName?: string | null }>,
  actorUserId: bigint | null,
  saas?: { actorEmail?: string | null; actorRole?: string | null; path?: string | null },
) {
  const tv = await prisma.themeVersion.findFirst({
    where: { id: themeVersionId, themeId, organizationId },
    include: { theme: { select: { name: true } } },
  });
  if (!tv) {
    throw new Error("Theme version not found.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.themeStyleToken.deleteMany({
      where: { themeVersionId, organizationId },
    });
    if (tokens.length > 0) {
      await tx.themeStyleToken.createMany({
        data: tokens.map((t) => ({
          organizationId,
          themeVersionId,
          tokenKey: t.tokenKey,
          value: t.value,
          groupName: t.groupName ?? null,
          createdById: actorUserId ?? undefined,
          updatedById: actorUserId ?? undefined,
        })),
      });
    }
  });

  await syncWebsiteActiveThemeVersionForLiveTheme(organizationId, themeId, themeVersionId);

  await logStorefrontAudit({
    organizationId,
    websiteId: undefined,
    eventType: STOREFRONT_AUDIT_EVENTS.THEME_UPDATE,
    actorUserId,
    resourceType: "theme_version",
    resourceId: themeVersionId.toString(),
    message: `Theme style tokens updated: ${tv.theme.name} v${tv.version}`,
    metadata: { themeId: themeId.toString(), tokenCount: tokens.length },
    saas,
  });
}

export async function replaceThemeVersionCustomizerContent(
  organizationId: bigint,
  themeId: bigint,
  themeVersionId: bigint,
  customizerContent: ThemeCustomizerContentState,
  actorUserId: bigint | null,
  saas?: { actorEmail?: string | null; actorRole?: string | null; path?: string | null },
) {
  const tv = await prisma.themeVersion.findFirst({
    where: { id: themeVersionId, themeId, organizationId },
    include: { theme: { select: { name: true } } },
  });
  if (!tv) {
    throw new Error("Theme version not found.");
  }

  const prev =
    tv.metadata && typeof tv.metadata === "object" && !Array.isArray(tv.metadata)
      ? { ...(tv.metadata as Record<string, unknown>) }
      : {};
  prev.customizerContent = customizerContent;

  await prisma.themeVersion.update({
    where: { id: themeVersionId },
    data: {
      metadata: prev as object,
      updatedById: actorUserId ?? undefined,
    },
  });

  await syncWebsiteActiveThemeVersionForLiveTheme(organizationId, themeId, themeVersionId);

  const imgCount = customizerContent.images?.length ?? 0;
  const textCount = customizerContent.texts?.length ?? 0;
  await logStorefrontAudit({
    organizationId,
    websiteId: undefined,
    eventType: STOREFRONT_AUDIT_EVENTS.THEME_UPDATE,
    actorUserId,
    resourceType: "theme_version",
    resourceId: themeVersionId.toString(),
    message: `Theme content overrides updated: ${tv.theme.name} v${tv.version}`,
    metadata: { themeId: themeId.toString(), imageRowCount: imgCount, textRowCount: textCount },
    saas,
  });
}

/** Clears storefront live selection for this theme, demotes the theme to draft, and archives published versions. */
export async function disableThemeForOrganization(
  organizationId: bigint,
  themeId: bigint,
  actorUserId: bigint | null,
  saas?: { actorEmail?: string | null; actorRole?: string | null; path?: string | null },
) {
  const theme = await prisma.theme.findFirst({
    where: { id: themeId, organizationId },
    select: { id: true, name: true },
  });
  if (!theme) {
    throw new Error("Theme not found.");
  }

  const clearedWebsiteIds = await prisma.$transaction(async (tx) => {
    const cleared = await clearWebsitesActiveThemeIfPointingAt(tx, organizationId, themeId);
    await tx.themeVersion.updateMany({
      where: { themeId, organizationId, status: "published" },
      data: { status: "archived" },
    });
    await tx.theme.update({
      where: { id: themeId },
      data: { status: "draft", updatedById: actorUserId ?? undefined },
    });
    return cleared;
  });

  if (clearedWebsiteIds.length > 0) {
    const { removeLiquidWebsiteStorefrontDir } = await import("@/lib/storefront/liquid/extract-shopify-theme");
    for (const wid of clearedWebsiteIds) {
      await removeLiquidWebsiteStorefrontDir(organizationId, wid);
    }
  }

  await logStorefrontAudit({
    organizationId,
    websiteId: clearedWebsiteIds[0] ?? undefined,
    eventType: STOREFRONT_AUDIT_EVENTS.THEME_DISABLE,
    actorUserId,
    resourceType: "theme",
    resourceId: themeId.toString(),
    message: `Theme disabled (unpublished from storefront): ${theme.name}`,
    metadata: {
      themeId: themeId.toString(),
      clearedWebsiteIds: clearedWebsiteIds.map((id) => id.toString()),
    },
    saas,
  });
}

/** Deletes a tenant theme and cascaded versions; clears any website live pointers and removes Liquid extract dirs. */
export async function deleteThemeForOrganization(
  organizationId: bigint,
  themeId: bigint,
  actorUserId: bigint | null,
  saas?: { actorEmail?: string | null; actorRole?: string | null; path?: string | null },
) {
  const theme = await prisma.theme.findFirst({
    where: { id: themeId, organizationId },
    select: { id: true, name: true },
  });
  if (!theme) {
    throw new Error("Theme not found.");
  }

  const versions = await prisma.themeVersion.findMany({
    where: { themeId, organizationId },
    select: { id: true },
  });
  const versionIds = versions.map((v) => v.id);

  const clearedWebsiteIds = await prisma.$transaction(async (tx) => {
    const cleared = await clearWebsitesActiveThemeIfPointingAt(tx, organizationId, themeId);
    await tx.theme.delete({ where: { id: themeId } });
    return cleared;
  });

  await removeLiquidThemeExtractDirs(organizationId, versionIds);

  if (clearedWebsiteIds.length > 0) {
    const { removeLiquidWebsiteStorefrontDir } = await import("@/lib/storefront/liquid/extract-shopify-theme");
    for (const wid of clearedWebsiteIds) {
      await removeLiquidWebsiteStorefrontDir(organizationId, wid);
    }
  }

  await logStorefrontAudit({
    organizationId,
    websiteId: clearedWebsiteIds[0] ?? undefined,
    eventType: STOREFRONT_AUDIT_EVENTS.THEME_DELETE,
    actorUserId,
    resourceType: "theme",
    resourceId: themeId.toString(),
    message: `Theme deleted: ${theme.name}`,
    metadata: {
      themeId: themeId.toString(),
      versionCount: versionIds.length,
      clearedWebsiteIds: clearedWebsiteIds.map((id) => id.toString()),
    },
    saas,
  });
}
