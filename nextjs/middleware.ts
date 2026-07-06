import { NextResponse, type NextRequest } from "next/server";

import { maybeRewriteStorefrontCustomDomain } from "@/lib/storefront/middleware-storefront-host";
import { maybeRewriteCompanyWebsiteCustomDomain } from "@/lib/company-themes/middleware-company-website-host";

const SUPERADMIN_PREFIX = "/superadmin";
const ADDON_SCOPES: [string[], string][] = [
  [["/project", "/projects"], "taskly"],
  [["/account"], "account"],
  [["/lms"], "lms"],
  [["/affiliate-business"], "affiliatebusiness"],
];
const AUTH_REQUIRED_PREFIXES = [
  "/launchpad",
  "/dashboard",
  "/pos",
  "/roles",
  "/users",
  "/sales-proposals",
  "/sales-proposal-templates",
  "/services",
  "/sales-invoices",
  "/sales-returns",
  "/purchase-invoices",
  "/purchase-returns",
  "/warehouses",
  "/transfers",
  "/media-library",
  "/messenger",
  "/helpdesk-tickets",
  "/helpdesk-categories",
  "/plans",
  "/bank-transfer",
  "/orders",
  "/settings",
  "/companies",
  "/coupons",
  "/email-templates",
  "/notification-templates",
  "/landing-page",
  "/business-modules",
  "/autopilot-modules",
  "/add-ons",
  "/expense-management",
  "/lms",
  "/affiliate-business",
  "/partner",
  "/marketplace/vendor",
];

function parseActivatedPackages(cookieValue: string | undefined): string[] {
  if (!cookieValue) return [];
  try {
    const arr = JSON.parse(cookieValue);
    return Array.isArray(arr) ? arr.map((p: unknown) => String(p).toLowerCase()) : [];
  } catch {
    return [];
  }
}

function redirectTo(req: NextRequest, pathname: string, searchParams?: Record<string, string>) {
  const url = req.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  if (searchParams) {
    for (const [k, v] of Object.entries(searchParams)) {
      url.searchParams.set(k, v);
    }
  }
  return NextResponse.redirect(url);
}

const SFC_SESSION = "sfc_session";

/**
 * Files under `public/storefront/...` are served at `/storefront/...` and must stay public for `/shop`.
 * The staff app also lives under `/storefront`, so we only bypass auth for known static subtrees.
 */
const STOREFRONT_PUBLIC_FILE_PREFIXES = ["/storefront/philly-water-ice"];

/** End-customer storefront account (separate from staff `pf_*` under /storefront/...). */
function storefrontCustomerAccountResponse(req: NextRequest, pathname: string): NextResponse {
  const m = pathname.match(/^\/storefront\/account\/w\/(\d+)(?:\/([^/]+))?/);
  if (!m) {
    return NextResponse.next();
  }
  const websiteId = m[1];
  const segment = m[2] ?? "";
  const publicSegments = new Set(["login", "signup", "forgot-password", "reset-password"]);
  if (segment === "" || publicSegments.has(segment)) {
    return NextResponse.next();
  }
  if (!req.cookies.get(SFC_SESSION)?.value) {
    const next = pathname + (req.nextUrl.search || "");
    return redirectTo(req, `/storefront/account/w/${websiteId}/login`, {
      next: next || `/storefront/account/w/${websiteId}/dashboard`,
    });
  }
  return NextResponse.next();
}

export async function middleware(req: NextRequest) {
  const storefrontRewrite = await maybeRewriteStorefrontCustomDomain(req);
  if (storefrontRewrite) return storefrontRewrite;

  const companyWebsiteRewrite = await maybeRewriteCompanyWebsiteCustomDomain(req);
  if (companyWebsiteRewrite) return companyWebsiteRewrite;

  const role = req.cookies.get("pf_role")?.value;
  const pathname = req.nextUrl.pathname;

  // Locale-prefixed paths like /en/dashboards/crm or /en/dashboard hit [...path] placeholders; real UI is /dashboard.
  if (/^\/[a-z]{2}(?:-[A-Za-z]{2})?\/dashboards(?:\/|$)/.test(pathname)) {
    return redirectTo(req, "/dashboard");
  }
  if (/^\/[a-z]{2}(?:-[A-Za-z]{2})?\/dashboard(?:\/|$)/.test(pathname)) {
    return redirectTo(req, "/dashboard");
  }

  // Add-on gating: if Project or Accounting add-on is disabled, redirect to dashboard
  if (role) {
    const activated = parseActivatedPackages(req.cookies.get("pf_activated_packages")?.value);

    const routingPrefixes = ["/projects/routes", "/projects/my-routes", "/projects/field-map"];
    if (routingPrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
      if (!activated.includes("routing")) {
        console.log(
          `[middleware] add-on gate: ${pathname} requires "routing" — not in [${activated.join(",")}] for role=${role ?? "none"} → redirect /dashboard`,
        );
        return redirectTo(req, "/dashboard");
      }
    } else {
      for (const [prefixes, module] of ADDON_SCOPES) {
        if (prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
          // B2C account pages are public; do not require the storefront add-on for staff cookies.
          if (module === "storefront" && pathname.startsWith("/storefront/account")) {
            break;
          }
          if (!activated.includes(module.toLowerCase())) {
            console.log(
              `[middleware] add-on gate: ${pathname} requires "${module}" — not in [${activated.join(",")}] for role=${role ?? "none"} → redirect /dashboard`,
            );
            return redirectTo(req, "/dashboard");
          }
          break;
        }
      }
    }
  }

  // Superadmin section
  if (pathname.startsWith(SUPERADMIN_PREFIX)) {
    if (role === "superadmin") return NextResponse.next();
    return redirectTo(req, "/login", { next: pathname });
  }

  // Partnerships management is superadmin-only.
  if (pathname === "/partnerships" || pathname.startsWith("/partnerships/")) {
    if (!role) return redirectTo(req, "/login", { next: pathname });
    if (role === "superadmin") return NextResponse.next();
    return redirectTo(req, "/dashboard");
  }

  // Legacy ownership routes → partnerships submenu.
  if (pathname === "/ownership" || pathname.startsWith("/ownership/")) {
    const ownershipRedirects: Record<string, string> = {
      "/ownership": "/partnerships/brands",
      "/ownership/brands": "/partnerships/brands",
      "/ownership/partners": "/partnerships/partners",
      "/ownership/requests": "/partnerships/ownership-requests",
      "/ownership/history": "/partnerships/ownership-history",
    };
    const target = ownershipRedirects[pathname] ?? "/partnerships/brands";
    return redirectTo(req, target);
  }

  // Storefront customer account (opaque `sfc_session`, not `pf_*`)
  if (pathname.startsWith("/storefront/account")) {
    return storefrontCustomerAccountResponse(req, pathname);
  }

  if (
    STOREFRONT_PUBLIC_FILE_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  ) {
    return NextResponse.next();
  }

  // Staff storefront builder (requires `pf_role` + storefront add-on when role is present)
  if (pathname === "/storefront" || pathname.startsWith("/storefront/")) {
    if (!role) return redirectTo(req, "/login", { next: pathname });
    return NextResponse.next();
  }

  // Any authenticated area (including /project, /projects, /account)
  if (
    AUTH_REQUIRED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ||
    pathname.startsWith("/project") ||
    pathname.startsWith("/projects") ||
    pathname.startsWith("/account")
  ) {
    if (role) return NextResponse.next();
    return redirectTo(req, "/login", { next: pathname });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?|txt|xml|map)$).*)",
    "/",
    "/(en|es|ar|da|de|fr|he|it|ja|nl|pl|pt|ru|tr|zh)/dashboards/:path*",
    "/(en|es|ar|da|de|fr|he|it|ja|nl|pl|pt|ru|tr|zh)/dashboard",
    "/(en|es|ar|da|de|fr|he|it|ja|nl|pl|pt|ru|tr|zh)/dashboard/:path*",
    "/pt-BR/dashboards/:path*",
    "/pt-BR/dashboard",
    "/pt-BR/dashboard/:path*",
    "/superadmin/:path*",
    "/partnerships",
    "/partnerships/:path*",
    "/ownership",
    "/ownership/:path*",
    "/partner",
    "/partner/:path*",
    "/launchpad",
    "/launchpad/:path*",
    "/dashboard",
    "/dashboard/:path*",
    "/project",
    "/project/:path*",
    "/projects",
    "/projects/:path*",
    "/account",
    "/account/:path*",
    "/pos/:path*",
    "/roles/:path*",
    "/users/:path*",
    "/sales-proposals/:path*",
    "/sales-proposal-templates/:path*",
    "/services/:path*",
    "/sales-invoices/:path*",
    "/sales-returns/:path*",
    "/purchase-invoices/:path*",
    "/purchase-returns/:path*",
    "/warehouses/:path*",
    "/transfers/:path*",
    "/media-library/:path*",
    "/messenger/:path*",
    "/helpdesk-tickets/:path*",
    "/helpdesk-categories/:path*",
    "/plans/:path*",
    "/bank-transfer/:path*",
    "/orders/:path*",
    "/settings/:path*",
    "/companies/:path*",
    "/coupons/:path*",
    "/email-templates/:path*",
    "/notification-templates/:path*",
    "/landing-page/:path*",
    "/business-modules/:path*",
    "/autopilot-modules",
    "/autopilot-modules/:path*",
    "/add-ons/:path*",
    "/expense-management",
    "/expense-management/:path*",
    "/lms",
    "/lms/:path*",
    "/storefront",
    "/storefront/:path*",
  ],
};
