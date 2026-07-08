import { NextRequest, NextResponse } from "next/server";

import { getCompanySiteEventByPublicSlug } from "@/lib/company-themes/company-site-events-service";
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
    const event = await getCompanySiteEventByPublicSlug(ownerId, eventSlug);
    if (!event) {
      return NextResponse.json({ ok: false, message: "Event not found." }, { status: 404 });
    }
    return NextResponse.json(
      { ok: true, event },
      { headers: { "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=120" } },
    );
  } catch (e: unknown) {
    console.error("[GET /api/company-sites/.../events/[eventSlug]]", e);
    return NextResponse.json(
      { ok: false, message: e instanceof Error ? e.message : "Could not load event." },
      { status: 500 },
    );
  }
}
