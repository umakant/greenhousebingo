import { NextRequest, NextResponse } from "next/server";

import { findCompanyWebsiteByCustomHostname, companyWebsiteHostnameFromHeader } from "@/lib/company-themes/company-website-custom-domain";

export const dynamic = "force-dynamic";

/** Lightweight host check for middleware (custom domain → company marketing site). */
export async function GET(req: NextRequest) {
  const raw = (req.nextUrl.searchParams.get("hostname") ?? "").trim();
  const hostname = companyWebsiteHostnameFromHeader(raw);
  if (!hostname) {
    return NextResponse.json({ companyWebsite: false });
  }

  const resolution = await findCompanyWebsiteByCustomHostname(hostname);
  return NextResponse.json(
    {
      companyWebsite: Boolean(resolution),
      companySlug: resolution?.companySlug ?? null,
      ownerId: resolution?.ownerId.toString() ?? null,
    },
    {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=300",
      },
    },
  );
}
