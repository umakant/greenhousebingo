/** Default browser title / sidebar label from the tenant company name. */
export function companyBrandTitleText(companyName: string): string {
  return companyName.trim();
}

/** Default footer line, e.g. © 2026 Acme Inc. All rights reserved. */
export function companyBrandFooterText(companyName: string, year = new Date().getFullYear()): string {
  const name = companyName.trim();
  if (!name) return "";
  return `© ${year} ${name}. All rights reserved.`;
}

export function brandTextDefaultsFromCompanyName(companyName: string) {
  const name = companyName.trim();
  return {
    titleText: name || "WorkDo",
    footerText: name ? companyBrandFooterText(name) : "© WorkDo. All rights reserved.",
  };
}
