import "server-only";

export type CompanyWebsiteChrome = {
  themeSlug: string;
  stylesheetHref: string;
  headerHtml: string;
  footerHtml: string;
  assetPrefix: string;
};

export function extractCompanyWebsiteChrome(
  html: string,
  assetPrefix: string,
): Omit<CompanyWebsiteChrome, "themeSlug"> | null {
  const headerMatch = html.match(/<header[\s\S]*?<\/header>/i);
  const footerMatch = html.match(/<footer[\s\S]*?<\/footer>/i);
  if (!headerMatch?.[0] || !footerMatch?.[0]) return null;

  const styleMatch = html.match(/<link[^>]+rel=["']stylesheet["'][^>]*>/i);
  let stylesheetHref = `${assetPrefix.replace(/\/$/, "")}/assets/styles.css`;
  if (styleMatch?.[0]) {
    const hrefMatch = styleMatch[0].match(/href=["']([^"']+)["']/i);
    if (hrefMatch?.[1]) stylesheetHref = hrefMatch[1];
  }

  return {
    stylesheetHref,
    headerHtml: rewriteChromeAssetUrls(headerMatch[0], assetPrefix),
    footerHtml: rewriteChromeAssetUrls(footerMatch[0], assetPrefix),
    assetPrefix: assetPrefix.replace(/\/$/, ""),
  };
}

function rewriteChromeAssetUrls(html: string, assetPrefix: string): string {
  const prefix = assetPrefix.replace(/\/$/, "");
  let output = html.replace(
    /((?:href|src)=["'])(?!https?:\/\/|\/\/|\/|#|mailto:|tel:|data:|javascript:)([^"']+)(["'])/gi,
    (_match, lead: string, url: string, tail: string) => {
      const cleaned = url.replace(/^\.\//, "");
      return `${lead}${prefix}/${cleaned}${tail}`;
    },
  );
  // Theme export sometimes leaves `assets/...` without ./ prefix after other rewrites.
  output = output.replace(
    /((?:href|src)=["'])(assets\/[^"']+)(["'])/gi,
    (_match, lead: string, url: string, tail: string) => `${lead}${prefix}/${url}${tail}`,
  );
  return output;
}
