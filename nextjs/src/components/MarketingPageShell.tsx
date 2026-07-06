"use client";

import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

/** Shared marketing layout: same header/footer as the home page. */
export function MarketingPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="pf-paperflight-home min-h-screen bg-background">
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}
