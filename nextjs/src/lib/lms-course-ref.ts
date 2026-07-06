import "server-only";

import { prisma } from "@/lib/prisma";

export type ResolvedLmsCourseRef = {
  id: bigint;
  title: string;
  slug: string;
  organizationId: bigint;
};

function parseCourseId(raw: string): bigint | null {
  const t = raw.trim();
  if (!/^\d+$/.test(t)) return null;
  try {
    return BigInt(t);
  } catch {
    return null;
  }
}

/**
 * Resolve a my-learning route segment (numeric id or course slug) within a tenant org.
 */
export async function resolveLmsCourseRef(
  raw: string,
  organizationId: bigint,
): Promise<ResolvedLmsCourseRef | null> {
  const segment = raw.trim();
  if (!segment) return null;

  const byId = parseCourseId(segment);
  if (byId != null) {
    const row = await prisma.course.findFirst({
      where: { id: byId, organizationId },
      select: { id: true, title: true, slug: true, organizationId: true },
    });
    if (row) return row;
  }

  const row = await prisma.course.findFirst({
    where: { slug: segment, organizationId },
    select: { id: true, title: true, slug: true, organizationId: true },
  });
  return row;
}

/** When org is unknown (e.g. superadmin), resolve globally then infer org from the course. */
export async function resolveLmsCourseRefGlobal(raw: string): Promise<ResolvedLmsCourseRef | null> {
  const segment = raw.trim();
  if (!segment) return null;

  const byId = parseCourseId(segment);
  if (byId != null) {
    const row = await prisma.course.findFirst({
      where: { id: byId },
      select: { id: true, title: true, slug: true, organizationId: true },
    });
    if (row) return row;
  }

  return prisma.course.findFirst({
    where: { slug: segment },
    select: { id: true, title: true, slug: true, organizationId: true },
  });
}
