import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { guardPartnershipAdmin } from "@/lib/partnership-api-guard";
import { ensureUniqueLandingSlug, serializeLandingPage } from "@/lib/partner-landing-service";

function parseId(id: string): bigint | null {
  try {
    return BigInt(id);
  } catch {
    return null;
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardPartnershipAdmin(req);
  if (denied) return denied;

  const { id } = await ctx.params;
  const pageId = parseId(id);
  if (!pageId) return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });

  const page = await prisma.partnerLandingPage.findFirst({ where: { id: pageId } });
  if (!page) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const data: Record<string, unknown> = { updatedAt: new Date() };

  if (body.title != null) data.title = String(body.title).trim();
  if (body.headline != null) data.headline = String(body.headline).trim() || null;
  if (body.subheadline != null) data.subheadline = String(body.subheadline).trim() || null;
  if (body.industryModule != null || body.industry_module != null) {
    data.industryModule = String(body.industryModule ?? body.industry_module).trim() || null;
  }
  if (body.logo != null) data.logo = String(body.logo).trim() || null;
  if (body.description != null) data.description = String(body.description).trim() || null;
  if (body.callToActionText != null || body.call_to_action_text != null) {
    data.callToActionText = String(body.callToActionText ?? body.call_to_action_text).trim() || null;
  }
  if (body.status != null) data.status = String(body.status).trim();
  if (body.slug != null) {
    const wanted = String(body.slug).trim();
    if (wanted && wanted !== page.slug) {
      data.slug = await ensureUniqueLandingSlug(page.partnerId, wanted);
    }
  }

  const updated = await prisma.partnerLandingPage.update({ where: { id: pageId }, data });
  return NextResponse.json({ ok: true, item: serializeLandingPage(updated) });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardPartnershipAdmin(req);
  if (denied) return denied;

  const { id } = await ctx.params;
  const pageId = parseId(id);
  if (!pageId) return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });

  await prisma.partnerLandingPage.deleteMany({ where: { id: pageId } });
  return NextResponse.json({ ok: true });
}
