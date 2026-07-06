import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import {
  findCompanyPublicSlugByOwnerId,
  resolveCompanyWebsiteFromAppRoute,
} from "@/lib/company-themes/company-website-host-resolver";
import { companySiteAccessUrl, resolveCompanySiteBasePath } from "@/lib/company-themes/company-website-custom-domain";
import { isCompanyWebsiteAccessBlocked } from "@/lib/company-themes/company-website-password";
import { renderCompanyWebsitePage } from "@/lib/company-themes/company-website-render";
import { normalizeCompanyWebsitePathname } from "@/lib/company-themes/load-theme-html";
import { buildRedirectUrl } from "@/lib/public-url";

type Ctx = { params: Promise<{ segments?: string[] }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  const { segments } = await params;
  let pathname = normalizeCompanyWebsitePathname(segments);
  if (pathname !== "/" && pathname.endsWith("/")) {
    pathname = pathname.slice(0, -1);
  }

  const store = await cookies();
  const userIdRaw = store.get("pf_user_id")?.value;
  let sessionUserId: bigint | null = null;
  if (userIdRaw) {
    try {
      sessionUserId = BigInt(userIdRaw);
    } catch {
      sessionUserId = null;
    }
  }

  const hostHeader = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const companySlugParam =
    req.nextUrl.searchParams.get("site") ?? req.nextUrl.searchParams.get("company");
  const resolved = await resolveCompanyWebsiteFromAppRoute(hostHeader, sessionUserId, {
    companySlugParam,
  });

  if (!resolved) {
    return new NextResponse(
      `<!doctype html><html><body style="font-family:system-ui;padding:2rem;max-width:40rem"><h1>Company site not found</h1><p>Open your public marketing site at <code>/sites/your-company-slug</code> (for example <code>/sites/DN-0001-CO-26</code>).</p></body></html>`,
      { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }

  const { ownerId, sitePathPrefix, mode } = resolved;
  const base = sitePathPrefix.replace(/\/$/, "") || "/company-website";

  if (mode === "public-slug" && base.startsWith("/sites/")) {
    const target = `${base}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(buildRedirectUrl(req, target), 307);
  }

  const companySlug = await findCompanyPublicSlugByOwnerId(ownerId);
  if (companySlug && (await isCompanyWebsiteAccessBlocked(ownerId, companySlug, req))) {
    const returnPath = `${req.nextUrl.pathname}${req.nextUrl.search}`;
    const siteBase = await resolveCompanySiteBasePath(ownerId, companySlug, hostHeader);
    return NextResponse.redirect(
      buildRedirectUrl(req, companySiteAccessUrl(siteBase, returnPath)),
    );
  }

  if (pathname === "/services") {
    return NextResponse.redirect(buildRedirectUrl(req, `${base}/`), 301);
  }

  /** Crimson theme HTML expects trailing slashes on these paths only. */
  const trailingSlashRoutes = [
    "/careers",
    "/project-style-2",
    "/services/background-checks",
    "/services/consulting",
    "/services/deployable-security",
    "/services/protective",
    "/services/transportation",
  ];
  if (trailingSlashRoutes.includes(pathname)) {
    return NextResponse.redirect(buildRedirectUrl(req, `${base}${pathname}/`), 301);
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
