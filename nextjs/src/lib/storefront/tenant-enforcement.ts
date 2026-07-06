import type { PrismaClient } from "@prisma/client";

/**
 * Hard tenant checks for Storefronts models: every query for a child row should
 * include `organizationId` (company tenant = `users.id`) to prevent cross-tenant access.
 */

export async function assertThemeVersionForOrg(
  prisma: PrismaClient,
  organizationId: bigint,
  themeVersionId: bigint,
): Promise<void> {
  const row = await prisma.themeVersion.findFirst({
    where: { id: themeVersionId, organizationId },
    select: { id: true },
  });
  if (!row) throw new Error("Theme version not found for this organization.");
}

export async function assertPageVersionForOrg(
  prisma: PrismaClient,
  organizationId: bigint,
  pageVersionId: bigint,
): Promise<void> {
  const row = await prisma.pageVersion.findFirst({
    where: { id: pageVersionId, organizationId },
    select: { id: true },
  });
  if (!row) throw new Error("Page version not found for this organization.");
}

export async function assertSectionInstanceForOrg(
  prisma: PrismaClient,
  organizationId: bigint,
  sectionInstanceId: bigint,
): Promise<void> {
  const row = await prisma.sectionInstance.findFirst({
    where: { id: sectionInstanceId, organizationId },
    select: { id: true },
  });
  if (!row) throw new Error("Section instance not found for this organization.");
}

export async function assertBlockInstanceForOrg(
  prisma: PrismaClient,
  organizationId: bigint,
  blockInstanceId: bigint,
): Promise<void> {
  const row = await prisma.blockInstance.findFirst({
    where: { id: blockInstanceId, organizationId },
    select: { id: true },
  });
  if (!row) throw new Error("Block instance not found for this organization.");
}
