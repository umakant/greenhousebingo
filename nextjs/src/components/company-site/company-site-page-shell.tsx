import type { ReactNode } from "react";

import { CompanySiteThemeChrome } from "@/components/company-site/company-site-theme-chrome";
import type { CompanyWebsiteChrome } from "@/lib/company-themes/company-theme-chrome";

type Props = {
  chrome: CompanyWebsiteChrome | null;
  companySlug: string;
  siteBase: string;
  children: ReactNode;
};

export function CompanySitePageShell({ chrome, companySlug, siteBase, children }: Props) {
  if (!chrome) {
    return <>{children}</>;
  }

  return (
    <>
      <link rel="stylesheet" href={chrome.stylesheetHref} precedence="default" />
      <link rel="stylesheet" href={`${chrome.assetPrefix}/assets/company-site-chrome.css`} precedence="default" />
      <CompanySiteThemeChrome chrome={chrome} companySlug={companySlug} siteBase={siteBase}>
        {children}
      </CompanySiteThemeChrome>
    </>
  );
}
