import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function listRecentEventLogs(
  organizationId: bigint,
  opts?: {
    websiteId?: bigint;
    /** Substring match on `eventType` (case-insensitive). */
    eventType?: string;
    /** Prefix match on `eventType` (case-insensitive), e.g. `storefront.page`. */
    eventPrefix?: string;
    /** Any of these prefixes (OR). Overrides `eventPrefix` when non-empty. */
    eventPrefixes?: string[];
    /** Search message or event type (case-insensitive). */
    q?: string;
    take?: number;
  },
) {
  const take = opts?.take ?? 100;
  const q = opts?.q?.trim();
  const prefixes =
    opts?.eventPrefixes && opts.eventPrefixes.length > 0
      ? opts.eventPrefixes
      : opts?.eventPrefix != null && opts.eventPrefix !== ""
        ? [opts.eventPrefix]
        : [];

  const andParts: Prisma.EventLogWhereInput[] = [];
  if (prefixes.length === 1) {
    andParts.push({ eventType: { startsWith: prefixes[0]!, mode: "insensitive" } });
  } else if (prefixes.length > 1) {
    andParts.push({
      OR: prefixes.map((prefix) => ({
        eventType: { startsWith: prefix, mode: "insensitive" },
      })),
    });
  }
  if (q) {
    andParts.push({
      OR: [
        { message: { contains: q, mode: "insensitive" } },
        { eventType: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  return prisma.eventLog.findMany({
    where: {
      organizationId,
      ...(opts?.websiteId != null ? { websiteId: opts.websiteId } : {}),
      ...(opts?.eventType != null && opts.eventType !== ""
        ? { eventType: { contains: opts.eventType, mode: "insensitive" } }
        : {}),
      ...(andParts.length > 0 ? { AND: andParts } : {}),
    },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      websiteId: true,
      eventType: true,
      severity: true,
      actorUserId: true,
      resourceType: true,
      resourceId: true,
      message: true,
      status: true,
      createdAt: true,
    },
  });
}

export async function createStorefrontEventLog(input: {
  organizationId: bigint;
  websiteId?: bigint | null;
  eventType: string;
  severity?: string;
  actorUserId?: bigint | null;
  resourceType?: string | null;
  resourceId?: string | null;
  message?: string | null;
  metadata?: object | null;
  status?: string;
  createdById?: bigint | null;
}) {
  return prisma.eventLog.create({
    data: {
      organizationId: input.organizationId,
      websiteId: input.websiteId ?? undefined,
      eventType: input.eventType,
      severity: input.severity ?? "info",
      actorUserId: input.actorUserId ?? undefined,
      resourceType: input.resourceType ?? undefined,
      resourceId: input.resourceId ?? undefined,
      message: input.message ?? undefined,
      metadata: input.metadata === undefined ? undefined : (input.metadata as object),
      status: input.status ?? "recorded",
      createdById: input.createdById ?? undefined,
    },
  });
}
