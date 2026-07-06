import "server-only";

import { prisma } from "@/lib/prisma";

/** Day 44 — KB articles visible on `/shop/help` for this tenant (+ shared rows with null organizationId). */
export async function listHelpArticlesForStorefrontOrganization(organizationId: bigint) {
  return prisma.stKnowledgeBase.findMany({
    where: {
      OR: [{ organizationId: null }, { organizationId }],
    },
    include: {
      category: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
}

export async function getHelpArticleForStorefrontOrganization(organizationId: bigint, articleId: bigint) {
  return prisma.stKnowledgeBase.findFirst({
    where: {
      id: articleId,
      OR: [{ organizationId: null }, { organizationId }],
    },
    include: {
      category: { select: { id: true, name: true } },
    },
  });
}
