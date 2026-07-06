import { NextRequest, NextResponse } from "next/server";

const TRAILING_SLASH_ROUTES = [
  "/careers",
  "/project-style-2",
  "/services/background-checks",
  "/services/consulting",
  "/services/deployable-security",
  "/services/protective",
  "/services/transportation",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/services") {
    return NextResponse.redirect(new URL("/", request.url), 301);
  }

  if (TRAILING_SLASH_ROUTES.includes(pathname)) {
    return NextResponse.redirect(new URL(`${pathname}/`, request.url), 301);
  }

  const rewriteUrl = request.nextUrl.clone();
  rewriteUrl.pathname = "/api/html";
  rewriteUrl.searchParams.set("path", pathname);

  return NextResponse.rewrite(rewriteUrl);
}

export const config = {
  matcher: [
    "/",
    "/about-us",
    "/about-us/:path*",
    "/careers",
    "/careers/:path*",
    "/contact-us",
    "/contact-us/:path*",
    "/project-style-2",
    "/project-style-2/:path*",
    "/services",
    "/services/:path*",
  ],
};
