import { NextRequest, NextResponse } from "next/server";

import {
  getCompanySiteEventByPublicSlug,
  listCompanySiteEvents,
} from "@/lib/company-themes/company-site-events-service";
import { findCompanyOwnerIdByPublicSlug } from "@/lib/company-themes/company-website-host-resolver";
import { isCompanyWebsiteAccessBlocked } from "@/lib/company-themes/company-website-password";

type Ctx = { params: Promise<{ companySlug: string }> };

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: Ctx) {
  const { companySlug } = await params;
  const ownerId = await findCompanyOwnerIdByPublicSlug(companySlug);
  if (!ownerId) {
    return NextResponse.json({ ok: false, message: "Company not found." }, { status: 404 });
  }

  if (await isCompanyWebsiteAccessBlocked(ownerId, companySlug, req)) {
    return NextResponse.json({ ok: false, message: "Access required." }, { status: 403 });
  }

  try {
    const payload = await listCompanySiteEvents(ownerId);
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=120" },
    });
  } catch (e: unknown) {
    console.error("[GET /api/company-sites/.../events]", e);
    return NextResponse.json(
      { ok: false, message: e instanceof Error ? e.message : "Could not load events." },
      { status: 500 },
    );
  }
}
