import { prisma } from "@/lib/prisma";
import { logStorefrontAudit, STOREFRONT_AUDIT_EVENTS } from "@/lib/storefront/storefront-audit";

function normalizePageSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-/]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/\/+/g, "/")
    .slice(0, 200);
}

export async function listPageVersions(organizationId: bigint, pageId: bigint) {
  return prisma.pageVersion.findMany({
    where: { pageId, organizationId },
    orderBy: { version: "desc" },
    select: {
      id: true,
      version: true,
      status: true,
      label: true,
      publishedAt: true,
      createdAt: true,
    },
  });
}

export async function listPagesForWebsite(organizationId: bigint, websiteId: bigint) {
  return prisma.page.findMany({
    where: { organizationId, websiteId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      updatedAt: true,
      _count: { select: { versions: true } },
    },
  });
}

export async function getPageWithLatestVersion(organizationId: bigint, pageId: bigint) {
  return prisma.page.findFirst({
    where: { id: pageId, organizationId },
    include: {
      versions: {
        orderBy: { version: "desc" },
        take: 1,
        include: {
          sections: {
            orderBy: { sortOrder: "asc" },
            include: {
              blocks: { orderBy: { sortOrder: "asc" } },
            },
          },
        },
      },
    },
  });
}

export async function createPageWithDraft(
  organizationId: bigint,
  websiteId: bigint,
  input: { slug: string; title: string; pageType?: string },
  actorUserId: bigint | null,
  saas?: { actorEmail?: string | null; actorRole?: string | null; path?: string | null },
) {
  const site = await prisma.website.findFirst({
    where: { id: websiteId, organizationId },
    select: { id: true },
  });
  if (!site) {
    throw new Error("Website not found.");
  }

  const slug = normalizePageSlug(input.slug);
  const meta = {
    pageType: input.pageType ?? "standard",
  };
  const page = await prisma.page.create({
    data: {
      organizationId,
      websiteId,
      slug,
      title: input.title.trim(),
      status: "draft",
      metadata: meta,
      createdById: actorUserId ?? undefined,
      updatedById: actorUserId ?? undefined,
      versions: {
        create: {
          organizationId,
          version: 1,
          status: "draft",
          label: "Draft v1",
          createdById: actorUserId ?? undefined,
          updatedById: actorUserId ?? undefined,
        },
      },
    },
  });

  await logStorefrontAudit({
    organizationId,
    websiteId,
    eventType: STOREFRONT_AUDIT_EVENTS.PAGE_CREATE,
    actorUserId,
    resourceType: "page",
    resourceId: page.id.toString(),
    message: `Page created: ${page.title}`,
    metadata: { slug: page.slug, version: 1 },
    saas,
  });
  return page;
}

export async function publishPageVersion(
  organizationId: bigint,
  pageId: bigint,
  versionId: bigint,
  actorUserId: bigint | null,
  opts?: { rollback?: boolean; saas?: { actorEmail?: string | null; actorRole?: string | null; path?: string | null } },
) {
  const pv = await prisma.pageVersion.findFirst({
    where: { id: versionId, pageId, organizationId },
    include: { page: { select: { id: true, websiteId: true, title: true, metadata: true } } },
  });
  if (!pv) {
    throw new Error("Page version not found.");
  }

  const prevMeta =
    pv.page.metadata && typeof pv.page.metadata === "object" && !Array.isArray(pv.page.metadata)
      ? { ...(pv.page.metadata as Record<string, unknown>) }
      : {};

  await prisma.$transaction([
    prisma.pageVersion.updateMany({
      where: { pageId, organizationId, status: "published" },
      data: { status: "archived" },
    }),
    prisma.pageVersion.update({
      where: { id: versionId },
      data: { status: "published", publishedAt: new Date() },
    }),
    prisma.page.update({
      where: { id: pageId },
      data: {
        status: "published",
        updatedById: actorUserId ?? undefined,
        metadata: {
          ...prevMeta,
          publishedVersionId: versionId.toString(),
          publishedAt: new Date().toISOString(),
        } as object,
      },
    }),
  ]);

  await logStorefrontAudit({
    organizationId,
    websiteId: pv.page.websiteId,
    eventType: opts?.rollback ? STOREFRONT_AUDIT_EVENTS.PAGE_ROLLBACK : STOREFRONT_AUDIT_EVENTS.PAGE_PUBLISH,
    actorUserId,
    resourceType: "page_version",
    resourceId: versionId.toString(),
    message: opts?.rollback ? `Page rollback: ${pv.page.title}` : `Page published: ${pv.page.title}`,
    metadata: { pageId: pageId.toString(), versionId: versionId.toString() },
    saas: opts?.saas,
  });
}

export async function unpublishPage(
  organizationId: bigint,
  pageId: bigint,
  actorUserId: bigint | null,
  saas?: { actorEmail?: string | null; actorRole?: string | null; path?: string | null },
) {
  const page = await prisma.page.findFirst({
    where: { id: pageId, organizationId },
    select: { id: true, websiteId: true, title: true },
  });
  if (!page) {
    throw new Error("Page not found.");
  }
  await prisma.page.update({
    where: { id: pageId },
    data: { status: "draft", updatedById: actorUserId ?? undefined },
  });
  await logStorefrontAudit({
    organizationId,
    websiteId: page.websiteId,
    eventType: STOREFRONT_AUDIT_EVENTS.PAGE_UNPUBLISH,
    actorUserId,
    resourceType: "page",
    resourceId: page.id.toString(),
    message: `Page unpublished: ${page.title}`,
    saas,
  });
}

/** Latest draft version with section/block tree, or null if none exists yet. */
export async function getPageDraftVersion(
  organizationId: bigint,
  pageId: bigint,
) {
  return prisma.pageVersion.findFirst({
    where: { pageId, organizationId, status: "draft" },
    orderBy: { version: "desc" },
    include: {
      sections: {
        orderBy: { sortOrder: "asc" },
        include: { blocks: { orderBy: { sortOrder: "asc" } } },
      },
    },
  });
}

/**
 * Ensures a draft `PageVersion` exists. If the page only has published/archived
 * versions, clones the latest version into a new draft (Day 13 / 16).
 */
export async function ensureDraftPageVersion(
  organizationId: bigint,
  pageId: bigint,
  actorUserId: bigint | null,
  saas?: { actorEmail?: string | null; actorRole?: string | null; path?: string | null },
) {
  const existing = await getPageDraftVersion(organizationId, pageId);
  if (existing) {
    return existing;
  }

  const latest = await prisma.pageVersion.findFirst({
    where: { pageId, organizationId },
    orderBy: { version: "desc" },
    include: {
      sections: {
        orderBy: { sortOrder: "asc" },
        include: { blocks: { orderBy: { sortOrder: "asc" } } },
      },
    },
  });
  if (!latest) {
    throw new Error("No page versions.");
  }

  const nextVersion = latest.version + 1;

  const created = await prisma.$transaction(async (tx) => {
    const nv = await tx.pageVersion.create({
      data: {
        organizationId,
        pageId,
        version: nextVersion,
        status: "draft",
        label: `Draft v${nextVersion}`,
        seoTitle: latest.seoTitle,
        seoDescription: latest.seoDescription,
        metadata: latest.metadata === null ? undefined : (latest.metadata as object),
        createdById: actorUserId ?? undefined,
        updatedById: actorUserId ?? undefined,
      },
    });
    for (const sec of latest.sections) {
      const ns = await tx.sectionInstance.create({
        data: {
          organizationId,
          pageVersionId: nv.id,
          themeSectionDefinitionId: sec.themeSectionDefinitionId ?? undefined,
          instanceKey: sec.instanceKey,
          sortOrder: sec.sortOrder,
          status: sec.status,
          settings: sec.settings === null ? undefined : (sec.settings as object),
          createdById: actorUserId ?? undefined,
          updatedById: actorUserId ?? undefined,
        },
      });
      for (const blk of sec.blocks) {
        await tx.blockInstance.create({
          data: {
            organizationId,
            sectionInstanceId: ns.id,
            themeBlockDefinitionId: blk.themeBlockDefinitionId ?? undefined,
            sortOrder: blk.sortOrder,
            status: blk.status,
            data: blk.data === null ? undefined : (blk.data as object),
            createdById: actorUserId ?? undefined,
            updatedById: actorUserId ?? undefined,
          },
        });
      }
    }
    return tx.pageVersion.findFirstOrThrow({
      where: { id: nv.id },
      include: {
        sections: {
          orderBy: { sortOrder: "asc" },
          include: { blocks: { orderBy: { sortOrder: "asc" } } },
        },
      },
    });
  });

  const page = await prisma.page.findFirst({
    where: { id: pageId, organizationId },
    select: { websiteId: true, title: true },
  });
  if (page) {
    await logStorefrontAudit({
      organizationId,
      websiteId: page.websiteId,
      eventType: STOREFRONT_AUDIT_EVENTS.PAGE_UPDATE,
      actorUserId,
      resourceType: "page_version",
      resourceId: created.id.toString(),
      message: `Draft version created: ${page.title} v${nextVersion}`,
      metadata: { pageId: pageId.toString(), version: nextVersion },
      saas,
    });
  }

  return created;
}

export type DraftSectionInput = {
  sortOrder: number;
  instanceKey?: string | null;
  settings?: Record<string, unknown> | null;
  blocks: Array<{ sortOrder: number; data?: Record<string, unknown> | null }>;
};

/** Replaces all sections/blocks on a draft page version (Day 16–17 editor save). */
export async function replaceDraftPageStructure(
  organizationId: bigint,
  pageId: bigint,
  pageVersionId: bigint,
  sections: DraftSectionInput[],
  actorUserId: bigint | null,
  saas?: { actorEmail?: string | null; actorRole?: string | null; path?: string | null },
) {
  const pv = await prisma.pageVersion.findFirst({
    where: { id: pageVersionId, pageId, organizationId, status: "draft" },
    include: { page: { select: { id: true, websiteId: true, title: true } } },
  });
  if (!pv) {
    throw new Error("Draft page version not found.");
  }

  const ordered = [...sections].sort((a, b) => a.sortOrder - b.sortOrder);

  await prisma.$transaction(async (tx) => {
    await tx.sectionInstance.deleteMany({
      where: { pageVersionId, organizationId },
    });
    for (const sec of ordered) {
      const ns = await tx.sectionInstance.create({
        data: {
          organizationId,
          pageVersionId,
          instanceKey: sec.instanceKey ?? null,
          sortOrder: sec.sortOrder,
          status: "active",
          settings: sec.settings === null ? undefined : (sec.settings as object),
          createdById: actorUserId ?? undefined,
          updatedById: actorUserId ?? undefined,
        },
      });
      const blocks = [...sec.blocks].sort((a, b) => a.sortOrder - b.sortOrder);
      for (const blk of blocks) {
        await tx.blockInstance.create({
          data: {
            organizationId,
            sectionInstanceId: ns.id,
            sortOrder: blk.sortOrder,
            status: "active",
            data: blk.data === null ? undefined : (blk.data as object),
            createdById: actorUserId ?? undefined,
            updatedById: actorUserId ?? undefined,
          },
        });
      }
    }
    await tx.pageVersion.update({
      where: { id: pageVersionId },
      data: { updatedById: actorUserId ?? undefined, updatedAt: new Date() },
    });
    await tx.page.update({
      where: { id: pageId },
      data: { updatedById: actorUserId ?? undefined },
    });
  });

  await logStorefrontAudit({
    organizationId,
    websiteId: pv.page.websiteId,
    eventType: STOREFRONT_AUDIT_EVENTS.PAGE_UPDATE,
    actorUserId,
    resourceType: "page_version",
    resourceId: pageVersionId.toString(),
    message: `Page draft saved: ${pv.page.title}`,
    metadata: { pageId: pageId.toString(), sectionCount: ordered.length },
    saas,
  });
}
