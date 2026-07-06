"use client";

import { useEffect, type ReactNode } from "react";

import type { CompanyWebsiteChrome } from "@/lib/company-themes/company-theme-chrome";

type Props = {
  chrome: CompanyWebsiteChrome;
  companySlug: string;
  siteBase: string;
  children: ReactNode;
};

declare global {
  interface Window {
    __COMPANY_SITE__?: {
      companySlug: string;
      sitePrefix: string;
      assetPrefix: string;
    };
  }
}

export function CompanySiteThemeChrome({ chrome, companySlug, siteBase, children }: Props) {
  useEffect(() => {
    window.__COMPANY_SITE__ = {
      companySlug,
      sitePrefix: siteBase,
      assetPrefix: chrome.assetPrefix,
    };

    const src = `${chrome.assetPrefix}/assets/company-site-commerce.js`;
    const css = `${chrome.assetPrefix}/assets/company-site-commerce.css`;
    if (!document.querySelector(`link[href="${css}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = css;
      document.head.appendChild(link);
    }
    if (document.querySelector(`script[src="${src}"]`)) return;

    const script = document.createElement("script");
    script.src = src;
    script.defer = true;
    document.body.appendChild(script);
  }, [chrome.assetPrefix, companySlug, siteBase]);

  return (
    <div className="company-site-theme-chrome">
      <div className="wwb-site-chrome" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: chrome.headerHtml }} />
      <div className="company-site-theme-chrome__main">{children}</div>
      <div className="wwb-site-chrome" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: chrome.footerHtml }} />
    </div>
  );
}
