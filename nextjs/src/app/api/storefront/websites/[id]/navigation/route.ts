import { NextRequest, NextResponse } from "next/server";

import { assertStorefrontApiAccess } from "@/lib/storefront-access";
import { requireStorefrontOrganization, saasActorFromRequest } from "@/lib/storefront/api-org";
import { mergeNavigationIntoMetadata, parseWebsiteNavigationMetadata, type StorefrontWebsiteNavigation } from "@/lib/storefront/navigation";
import { logStorefrontAudit, STOREFRONT_AUDIT_EVENTS } from "@/lib/storefront/storefront-audit";
import { STOREFRONT_PERMISSION } from "@/lib/storefront-permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await assertStorefrontApiAccess(req, { permission: STOREFRONT_PERMISSION.VIEW });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const { id } = await ctx.params;
  let wid: bigint;
  try {
    wid = BigInt(id);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });
  }

  const site = await prisma.website.findFirst({
    where: { id: wid, organizationId: org.organizationId },
    select: { metadata: true },
  });
  if (!site) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });

  const navigation = parseWebsiteNavigationMetadata(site.metadata);
  return NextResponse.json({ ok: true, data: navigation });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await assertStorefrontApiAccess(req, { permission: STOREFRONT_PERMISSION.PAGE_MANAGE });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const { id } = await ctx.params;
  let wid: bigint;
  try {
    wid = BigInt(id);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as { navigation?: StorefrontWebsiteNavigation };
  if (!body.navigation || typeof body.navigation !== "object") {
    return NextResponse.json({ ok: false, message: "navigation object required." }, { status: 400 });
  }

  const site = await prisma.website.findFirst({
    where: { id: wid, organizationId: org.organizationId },
    select: { metadata: true },
  });
  if (!site) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });

  const nav: StorefrontWebsiteNavigation = {
    main: Array.isArray(body.navigation.main) ? body.navigation.main : [],
    footer: Array.isArray(body.navigation.footer) ? body.navigation.footer : [],
    updatedAt: new Date().toISOString(),
  };

  const nextMeta = mergeNavigationIntoMetadata(site.metadata, nav);
  await prisma.website.update({
    where: { id: wid },
    data: { metadata: nextMeta as object },
  });

  await logStorefrontAudit({
    organizationId: org.organizationId,
    websiteId: wid,
    eventType: STOREFRONT_AUDIT_EVENTS.NAVIGATION_UPDATE,
    actorUserId: org.userId,
    resourceType: "navigation",
    resourceId: wid.toString(),
    message: "Navigation updated",
    metadata: { itemsMain: nav.main.length, itemsFooter: nav.footer.length },
    saas: { ...saasActorFromRequest(req) },
  });

  return NextResponse.json({ ok: true, data: nav });
}
