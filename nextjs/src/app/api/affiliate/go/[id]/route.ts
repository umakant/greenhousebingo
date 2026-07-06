import { NextResponse, type NextRequest } from "next/server";

import { ensureAffiliateBusinessTables } from "@/lib/affiliate-business-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Public click-through: increments link + partner clicks, redirects to tracking URL. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let linkId: bigint;
  try {
    linkId = BigInt(id);
  } catch {
    return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:5000"));
  }

  await ensureAffiliateBusinessTables();

  const link = await prisma.affiliateLink.findUnique({
    where: { id: linkId },
    select: {
      id: true,
      status: true,
      trackingUrl: true,
      partnerId: true,
    },
  });

  if (!link || link.status !== "active" || !link.trackingUrl) {
    return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:5000"));
  }

  await prisma.$transaction([
    prisma.affiliateLink.update({
      where: { id: linkId },
      data: { clickCount: { increment: 1 }, updatedAt: new Date() },
    }),
    prisma.affiliatePartner.update({
      where: { id: link.partnerId },
      data: { totalClicks: { increment: 1 }, updatedAt: new Date() },
    }),
  ]);

  return NextResponse.redirect(link.trackingUrl);
}
