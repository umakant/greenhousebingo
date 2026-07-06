import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { guardPartnerApi } from "@/lib/partner-api-guard";
import { ensureUniqueLandingSlug, nextPartnerLandingPageId, serializeLandingPage } from "@/lib/partner-landing-service";

export async function GET(req: NextRequest) {
  const guard = await guardPartnerApi(req);
  if ("error" in guard) return guard.error;

  const pages = await prisma.partnerLandingPage.findMany({
    where: { partnerId: guard.partner.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    ok: true,
    partnerSlug: guard.partner.slug,
    items: pages.map(serializeLandingPage),
  });
}

export async function POST(req: NextRequest) {
  const guard = await guardPartnerApi(req);
  if ("error" in guard) return guard.error;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const title = String(body.title ?? "").trim();
  if (!title) return NextResponse.json({ ok: false, message: "Title is required." }, { status: 400 });

  const slug = await ensureUniqueLandingSlug(guard.partner.id, String(body.slug ?? title));

  const page = await prisma.partnerLandingPage.create({
    data: {
      id: await nextPartnerLandingPageId(),
      partnerId: guard.partner.id,
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
