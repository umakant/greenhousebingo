import { NextResponse, type NextRequest } from "next/server";

import { requireAffiliateApiAccess } from "@/lib/affiliate-access";
import { buildAffiliateTrackingUrl } from "@/lib/affiliate-link-utils";
import { getAffiliateDefaultLandingUrl, serializeLink } from "@/lib/affiliate-business-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const linkInclude = {
  partner: { select: { id: true, name: true, referralCode: true } },
  program: { select: { id: true, name: true } },
} as const;

type RouteCtx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const gate = await requireAffiliateApiAccess(req, "manage-affiliate-links");
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  let linkId: bigint;
  try {
    linkId = BigInt(id);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });
  }

  const existing = await prisma.affiliateLink.findFirst({
    where: { id: linkId, organizationId: gate.actor.organizationId },
    include: linkInclude,
  });
  if (!existing) {
    return NextResponse.json({ ok: false, message: "Link not found." }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const destinationUrl =
    body.destinationUrl != null || body.destination_url != null
      ? String(body.destinationUrl ?? body.destination_url ?? "").trim() || null
      : existing.destinationUrl;

  const baseUrl = await getAffiliateDefaultLandingUrl(gate.actor.organizationId);
  const trackingUrl = buildAffiliateTrackingUrl({
    baseUrl,
    referralCode: existing.partner.referralCode,
    programId: existing.program.id.toString(),
    slug: existing.slug,
    destinationUrl,
  });

  const row = await prisma.affiliateLink.update({
    where: { id: linkId },
    data: {
      label: body.label != null ? String(body.label).trim() || null : undefined,
      destinationUrl,
      trackingUrl: trackingUrl || existing.trackingUrl,
      status: body.status != null ? String(body.status).trim() || "active" : undefined,
      updatedAt: new Date(),
    },
    include: linkInclude,
  });

  return NextResponse.json({ ok: true, item: serializeLink(row) });
}

export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  const gate = await requireAffiliateApiAccess(req, "manage-affiliate-links");
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  let linkId: bigint;
  try {
    linkId = BigInt(id);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });
  }

  const existing = await prisma.affiliateLink.findFirst({
    where: { id: linkId, organizationId: gate.actor.organizationId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ ok: false, message: "Link not found." }, { status: 404 });
  }

  await prisma.affiliateLink.delete({ where: { id: linkId } });
  return NextResponse.json({ ok: true });
}
