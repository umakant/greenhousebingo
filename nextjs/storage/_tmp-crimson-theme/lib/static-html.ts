import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

/** Maps public URL paths to HTML files under /public */
export const HTML_ROUTES: Record<string, string> = {
  "/": "index.html",
  "/about-us": "about-us/index.html",
  "/about-us/": "about-us/index.html",
  "/careers": "careers/index.html",
  "/careers/": "careers/index.html",
  "/contact-us": "contact-us/index.html",
  "/contact-us/": "contact-us/index.html",
  "/project-style-2": "project-style-2/index.html",
  "/project-style-2/": "project-style-2/index.html",
  "/services/background-checks": "services/background-checks/index.html",
  "/services/background-checks/": "services/background-checks/index.html",
  "/services/consulting": "services/consulting/index.html",
  "/services/consulting/": "services/consulting/index.html",
  "/services/deployable-security": "services/deployable-security/index.html",
  "/services/deployable-security/": "services/deployable-security/index.html",
  "/services/protective": "services/protective/index.html",
  "/services/protective/": "services/protective/index.html",
  "/services/transportation": "services/transportation/index.html",
  "/services/transportation/": "services/transportation/index.html",
};

export function resolveHtmlFile(pathname: string): string | null {
  const normalized = pathname.endsWith("/") && pathname !== "/"
    ? pathname.slice(0, -1)
    : pathname;

  if (HTML_ROUTES[pathname]) {
    return HTML_ROUTES[pathname];
  }

  if (HTML_ROUTES[normalized]) {
    return HTML_ROUTES[normalized];
  }

  if (HTML_ROUTES[`${normalized}/`]) {
    return HTML_ROUTES[`${normalized}/`];
  }

  return null;
}

/** Rewrite relative asset URLs so pages work from any Next.js route. */
export function normalizeHtmlPaths(html: string): string {
  let output = html;

  output = output.replace(
    /((?:href|src)=["'])(?!https?:\/\/|\/\/|\/|#|mailto:|tel:|data:)([^"']+)(["'])/gi,
    (_match, prefix: string, url: string, suffix: string) => {
      const cleaned = url.replace(/^\.\//, "");
      return `${prefix}/${cleaned}${suffix}`;
    },
  );

  output = output.replace(
    /url\(\s*(['"]?)(?!https?:\/\/|\/\/|\/|data:)([^'")]+)\1\s*\)/gi,
    (_match, quote: string, url: string) => `url(${quote}/${url.replace(/^\.\//, "")}${quote})`,
  );

  return output;
}

export function loadStaticHtml(pathname: string): string | null {
  const relativeFile = resolveHtmlFile(pathname);
  if (!relativeFile) {
    return null;
  }

  const filePath = join(process.cwd(), "public", relativeFile);
  if (!existsSync(filePath)) {
    return null;
  }

  const html = readFileSync(filePath, "utf-8");
  return normalizeHtmlPaths(html);
}

export function listTemplateRoutes(): string[] {
  return [...new Set(Object.keys(HTML_ROUTES).filter((route) => !route.endsWith("/") || route === "/"))];
}
