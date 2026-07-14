import { NextRequest, NextResponse } from "next/server";

import { listPublicEventPlants } from "@/lib/company-themes/company-site-plant-bingo-checkout";
import { findCompanyOwnerIdByPublicSlug } from "@/lib/company-themes/company-website-host-resolver";
import { isCompanyWebsiteAccessBlocked } from "@/lib/company-themes/company-website-password";

type Ctx = { params: Promise<{ companySlug: string; eventSlug: string }> };

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: Ctx) {
  const { companySlug, eventSlug } = await params;
  const ownerId = await findCompanyOwnerIdByPublicSlug(companySlug);
  if (!ownerId) {
    return NextResponse.json({ ok: false, message: "Company not found." }, { status: 404 });
  }

  if (await isCompanyWebsiteAccessBlocked(ownerId, companySlug, req)) {
    return NextResponse.json({ ok: false, message: "Access required." }, { status: 403 });
  }

  try {
    const result = await listPublicEventPlants(ownerId, eventSlug);
    if (!result) {
      return NextResponse.json({ ok: false, message: "Event not found." }, { status: 404 });
    }
    return NextResponse.json(
      { ok: true, eventId: result.eventId, plants: result.plants },
      { headers: { "Cache-Control": "public, max-age=0, s-maxage=30, stale-while-revalidate=60" } },
    );
  } catch (e: unknown) {
    console.error("[GET /api/company-sites/.../plants]", e);
    return NextResponse.json(
      { ok: false, message: e instanceof Error ? e.message : "Could not load plants." },
      { status: 500 },
    );
  }
}
