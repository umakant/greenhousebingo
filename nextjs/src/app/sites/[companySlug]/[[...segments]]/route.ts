import { NextRequest, NextResponse } from "next/server";

import { findCompanyOwnerIdByPublicSlug } from "@/lib/company-themes/company-website-host-resolver";
import { companySiteAccessUrl, resolveCompanySiteBasePath } from "@/lib/company-themes/company-website-custom-domain";
import { isCompanyWebsiteAccessBlocked } from "@/lib/company-themes/company-website-password";
import { renderCompanyWebsitePage } from "@/lib/company-themes/company-website-render";
import { normalizeCompanyWebsitePathname } from "@/lib/company-themes/load-theme-html";
import { buildRedirectUrl } from "@/lib/public-url";

type Ctx = { params: Promise<{ companySlug: string; segments?: string[] }> };

/** Public company marketing site — no sign-in required. URL: /sites/{company-slug}/… */
export async function GET(req: NextRequest, { params }: Ctx) {
  const { companySlug, segments } = await params;
  let pathname = normalizeCompanyWebsitePathname(segments);
  if (pathname !== "/" && pathname.endsWith("/")) {
    pathname = pathname.slice(0, -1);
  }
  const sitePathPrefix = `/sites/${encodeURIComponent(companySlug)}`;

  const ownerId = await findCompanyOwnerIdByPublicSlug(companySlug);
  if (!ownerId) {
    return new NextResponse("Company site not found.", { status: 404 });
  }

  if (await isCompanyWebsiteAccessBlocked(ownerId, companySlug, req)) {
    const returnPath = `${req.nextUrl.pathname}${req.nextUrl.search}`;
    const siteBase = await resolveCompanySiteBasePath(
      ownerId,
      companySlug,
      req.headers.get("x-forwarded-host") ?? req.headers.get("host"),
    );
    return NextResponse.redirect(
      buildRedirectUrl(req, companySiteAccessUrl(siteBase, returnPath)),
    );
  }

  const result = await renderCompanyWebsitePage(ownerId, pathname, sitePathPrefix);
  return new NextResponse(result.html, {
    status: result.ok ? 200 : result.status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": result.ok ? result.cacheControl : "no-store",
    },
  });
}
