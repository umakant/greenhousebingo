import { prisma } from "@/lib/prisma";
import { logStorefrontAudit, STOREFRONT_AUDIT_EVENTS } from "@/lib/storefront/storefront-audit";

function normalizeHostname(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .split("/")[0]!
    .replace(/:\d+$/, "");
}

export async function listDomainsForWebsite(organizationId: bigint, websiteId: bigint) {
  return prisma.domain.findMany({
    where: { organizationId, websiteId },
    orderBy: [{ isPrimary: "desc" }, { hostname: "asc" }],
    select: {
      id: true,
      hostname: true,
      status: true,
      isPrimary: true,
      verifiedAt: true,
      updatedAt: true,
    },
  });
}

export async function findDomainByHostname(hostname: string) {
  return prisma.domain.findFirst({
    where: { hostname: hostname.toLowerCase() },
    include: {
      website: {
        select: { id: true, organizationId: true, slug: true, status: true },
      },
    },
  });
}

export async function createDomainForWebsite(
  organizationId: bigint,
  websiteId: bigint,
  input: { hostname: string; isPrimary?: boolean; status?: string },
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

  const hostname = normalizeHostname(input.hostname);
  const dup = await prisma.domain.findFirst({ where: { hostname }, select: { id: true } });
  if (dup) {
    throw new Error("Domain hostname is already in use.");
  }

  if (input.isPrimary) {
    await prisma.domain.updateMany({
      where: { websiteId, organizationId },
      data: { isPrimary: false },
    });
  }

  const d = await prisma.domain.create({
    data: {
      organizationId,
      websiteId,
      hostname,
      status: input.status ?? "pending",
      isPrimary: input.isPrimary ?? false,
      createdById: actorUserId ?? undefined,
      updatedById: actorUserId ?? undefined,
    },
  });

  await logStorefrontAudit({
    organizationId,
    websiteId,
    eventType: STOREFRONT_AUDIT_EVENTS.DOMAIN_ATTACH,
    actorUserId,
    resourceType: "domain",
    resourceId: d.id.toString(),
    message: `Domain attached: ${hostname}`,
    metadata: { hostname, isPrimary: d.isPrimary },
    saas,
  });
  return d;
}

export async function updateDomain(
  organizationId: bigint,
  domainId: bigint,
  input: Partial<{ status: string; isPrimary: boolean }>,
  actorUserId: bigint | null,
  saas?: { actorEmail?: string | null; actorRole?: string | null; path?: string | null },
) {
  const row = await prisma.domain.findFirst({
    where: { id: domainId, organizationId },
    include: { website: { select: { id: true } } },
  });
  if (!row) {
    throw new Error("Domain not found.");
  }

  if (input.isPrimary === true) {
    await prisma.domain.updateMany({
      where: { websiteId: row.websiteId, organizationId },
      data: { isPrimary: false },
    });
  }

  const d = await prisma.domain.update({
    where: { id: domainId },
    data: {
      ...(input.status != null ? { status: input.status } : {}),
      ...(input.isPrimary != null ? { isPrimary: input.isPrimary } : {}),
      updatedById: actorUserId ?? undefined,
    },
  });

  await logStorefrontAudit({
    organizationId,
    websiteId: row.websiteId,
    eventType: STOREFRONT_AUDIT_EVENTS.DOMAIN_UPDATE,
    actorUserId,
    resourceType: "domain",
    resourceId: d.id.toString(),
    message: `Domain updated: ${d.hostname}`,
    metadata: { hostname: d.hostname, status: d.status },
    saas,
  });
  return d;
}

export async function deleteDomain(
  organizationId: bigint,
  domainId: bigint,
  actorUserId: bigint | null,
  saas?: { actorEmail?: string | null; actorRole?: string | null; path?: string | null },
) {
  const row = await prisma.domain.findFirst({
    where: { id: domainId, organizationId },
    select: { id: true, hostname: true, websiteId: true },
  });
  if (!row) return false;
  await prisma.domain.delete({ where: { id: domainId } });
  await logStorefrontAudit({
    organizationId,
    websiteId: row.websiteId,
    eventType: STOREFRONT_AUDIT_EVENTS.DOMAIN_REMOVE,
    actorUserId,
    resourceType: "domain",
    resourceId: row.id.toString(),
    message: `Domain removed: ${row.hostname}`,
    metadata: { hostname: row.hostname },
    saas,
  });
  return true;
}
