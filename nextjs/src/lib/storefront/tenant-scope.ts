import type { PrismaClient } from "@prisma/client";

/**
 * organizationId is always the company tenant user id (users.id, type company/company_admin root).
 */

export async function getWebsiteScoped(
  prisma: PrismaClient,
  organizationId: bigint,
  websiteId: bigint,
) {
  return prisma.website.findFirst({
    where: { id: websiteId, organizationId },
    select: { id: true, organizationId: true, slug: true, status: true, name: true },
  });
}

export async function assertWebsiteBelongsToOrg(
  prisma: PrismaClient,
  organizationId: bigint,
  websiteId: bigint,
): Promise<void> {
  const row = await getWebsiteScoped(prisma, organizationId, websiteId);
  if (!row) {
    throw new Error("Website not found or does not belong to this organization.");
  }
}

export async function getPageScoped(
  prisma: PrismaClient,
  organizationId: bigint,
  websiteId: bigint,
  pageId: bigint,
) {
  return prisma.page.findFirst({
    where: { id: pageId, organizationId, websiteId },
    select: { id: true, slug: true, title: true, status: true },
  });
}

export async function getThemeScoped(
  prisma: PrismaClient,
  organizationId: bigint,
  themeId: bigint,
) {
  return prisma.theme.findFirst({
    where: { id: themeId, organizationId },
    select: { id: true, slug: true, name: true, status: true, websiteId: true },
  });
}

export async function getThemeVersionScoped(
  prisma: PrismaClient,
  organizationId: bigint,
  themeVersionId: bigint,
) {
  return prisma.themeVersion.findFirst({
    where: { id: themeVersionId, organizationId },
    select: { id: true, themeId: true, version: true, status: true },
  });
}

export async function getPageVersionScoped(
  prisma: PrismaClient,
  organizationId: bigint,
  pageVersionId: bigint,
) {
  return prisma.pageVersion.findFirst({
    where: { id: pageVersionId, organizationId },
    select: { id: true, pageId: true, version: true, status: true },
  });
}
