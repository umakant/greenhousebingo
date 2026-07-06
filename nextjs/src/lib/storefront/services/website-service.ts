import { prisma } from "@/lib/prisma";
import { logStorefrontAudit, STOREFRONT_AUDIT_EVENTS } from "@/lib/storefront/storefront-audit";

function normalizeSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 128);
}

/** List storefront websites for a company tenant (`users.id`). */
export async function listWebsitesForOrganization(organizationId: bigint) {
  return prisma.website.findMany({
    where: { organizationId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      defaultLocale: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function getWebsiteBySlug(organizationId: bigint, slug: string) {
  return prisma.website.findFirst({
    where: { organizationId, slug },
    include: {
      domains: { select: { id: true, hostname: true, status: true, isPrimary: true } },
    },
  });
}

export async function getWebsiteById(organizationId: bigint, websiteId: bigint) {
  return prisma.website.findFirst({
    where: { id: websiteId, organizationId },
    include: {
      domains: { orderBy: { hostname: "asc" } },
    },
  });
}

export async function createWebsite(
  organizationId: bigint,
  input: { name: string; slug: string; status?: string; defaultLocale?: string | null },
  actorUserId: bigint | null,
  saas?: { actorEmail?: string | null; actorRole?: string | null; path?: string | null },
) {
  const slug = normalizeSlug(input.slug);
  const w = await prisma.website.create({
    data: {
      organizationId,
      name: input.name.trim(),
      slug,
      status: input.status ?? "draft",
      defaultLocale: input.defaultLocale?.trim() || null,
      createdById: actorUserId ?? undefined,
      updatedById: actorUserId ?? undefined,
    },
  });
  await logStorefrontAudit({
    organizationId,
    websiteId: w.id,
    eventType: STOREFRONT_AUDIT_EVENTS.WEBSITE_CREATE,
    actorUserId,
    resourceType: "website",
    resourceId: w.id.toString(),
    message: `Website created: ${w.name}`,
    metadata: { slug: w.slug, name: w.name },
    saas,
  });
  return w;
}

export async function updateWebsite(
  organizationId: bigint,
  websiteId: bigint,
  input: Partial<{ name: string; slug: string; status: string; defaultLocale: string | null }>,
  actorUserId: bigint | null,
  saas?: { actorEmail?: string | null; actorRole?: string | null; path?: string | null },
) {
  const data: {
    name?: string;
    slug?: string;
    status?: string;
    defaultLocale?: string | null;
    updatedById?: bigint;
  } = { updatedById: actorUserId ?? undefined };
  if (input.name != null) data.name = input.name.trim();
  if (input.slug != null) data.slug = normalizeSlug(input.slug);
  if (input.status != null) data.status = input.status;
  if (input.defaultLocale !== undefined) data.defaultLocale = input.defaultLocale?.trim() || null;

  const existing = await prisma.website.findFirst({
    where: { id: websiteId, organizationId },
    select: { id: true },
  });
  if (!existing) {
    throw new Error("Website not found.");
  }
  const w = await prisma.website.update({
    where: { id: websiteId },
    data,
  });
  await logStorefrontAudit({
    organizationId,
    websiteId: w.id,
    eventType: STOREFRONT_AUDIT_EVENTS.WEBSITE_UPDATE,
    actorUserId,
    resourceType: "website",
    resourceId: w.id.toString(),
    message: `Website updated: ${w.name}`,
    metadata: data as Record<string, unknown>,
    saas,
  });
  return w;
}

export async function deleteWebsite(
  organizationId: bigint,
  websiteId: bigint,
  actorUserId: bigint | null,
  saas?: { actorEmail?: string | null; actorRole?: string | null; path?: string | null },
) {
  const w = await prisma.website.findFirst({
    where: { id: websiteId, organizationId },
    select: { id: true, name: true, slug: true },
  });
  if (!w) return false;
  await prisma.website.delete({ where: { id: websiteId } });
  await logStorefrontAudit({
    organizationId,
    websiteId,
    eventType: STOREFRONT_AUDIT_EVENTS.WEBSITE_DELETE,
    actorUserId,
    resourceType: "website",
    resourceId: w.id.toString(),
    message: `Website deleted: ${w.name}`,
    metadata: { slug: w.slug },
    saas,
  });
  return true;
}
