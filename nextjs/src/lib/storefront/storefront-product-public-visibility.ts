import type { Prisma } from "@prisma/client";

/**
 * POS product rows that are visible on the public storefront **right now**:
 * published, active, and either no schedule or `storefrontPublishAt` has passed.
 */
export function storefrontProductPublicLiveWhere(now: Date = new Date()): Prisma.PosProductWhereInput {
  return {
    storefrontPublished: true,
    isActive: true,
    OR: [{ storefrontPublishAt: null }, { storefrontPublishAt: { lte: now } }],
  };
}
