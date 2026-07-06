import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { guardPartnershipAdmin } from "@/lib/partnership-api-guard";
import { ensureUniqueLandingSlug, nextPartnerLandingPageId, serializeLandingPage } from "@/lib/partner-landing-service";

export async function GET(req: NextRequest) {
  const denied = await guardPartnershipAdmin(req);
  if (denied) return denied;

  const url = new URL(req.url);
  const partnerFilter = (url.searchParams.get("partnerId") ?? "").trim();

  const where: Record<string, unknown> = {};
  if (partnerFilter) {
    try {
      where.partnerId = BigInt(partnerFilter);
    } catch {
      /* ignore */
    }
  }

  const [pages, partners] = await Promise.all([
    prisma.partnerLandingPage.findMany({ where, orderBy: { createdAt: "desc" } }),
    prisma.partner.findMany({ select: { id: true, name: true, slug: true } }),
  ]);
  const partnerById = new Map(partners.map((p) => [p.id.toString(), p]));

  return NextResponse.json({
    ok: true,
    items: pages.map((p) => ({
      ...serializeLandingPage(p),
      partnerName: partnerById.get(p.partnerId.toString())?.name ?? "—",
      partnerSlug: partnerById.get(p.partnerId.toString())?.slug ?? null,
    })),
    partners: partners.map((p) => ({ id: p.id.toString(), name: p.name, slug: p.slug })),
  });
}

export async function POST(req: NextRequest) {
  const denied = await guardPartnershipAdmin(req);
  if (denied) return denied;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  let partnerId: bigint;
  try {
    partnerId = BigInt(String(body.partnerId ?? body.partner_id));
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid partnerId." }, { status: 400 });
  }
  const partner = await prisma.partner.findFirst({ where: { id: partnerId }, select: { id: true } });
  if (!partner) return NextResponse.json({ ok: false, message: "Partner not found." }, { status: 404 });

  const title = String(body.title ?? "").trim();
  if (!title) return NextResponse.json({ ok: false, message: "Title is required." }, { status: 400 });

  const slug = await ensureUniqueLandingSlug(partnerId, String(body.slug ?? title));

  const page = await prisma.partnerLandingPage.create({
    data: {
      id: await nextPartnerLandingPageId(),
      partnerId,
      title,
      slug,
      headline: String(body.headline ?? "").trim() || null,
      subheadline: String(body.subheadline ?? "").trim() || null,
      industryModule: String(body.industryModule ?? body.industry_module ?? "").trim() || null,
      logo: String(body.logo ?? "").trim() || null,
      description: String(body.description ?? "").trim() || null,
      callToActionText: String(body.callToActionText ?? body.call_to_action_text ?? "").trim() || null,
      status: String(body.status ?? "draft").trim() || "draft",
      createdAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true, item: serializeLandingPage(page) }, { status: 201 });
}
