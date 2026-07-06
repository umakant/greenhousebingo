import type { ReactNode } from "react";
import { SiteFooter } from "@/components/waterice/site-footer";
import { FloatingSocialBar } from "@/components/waterice/floating-social-bar";

/**
 * Wraps every Water Ice Express public page in the `.wie-site` design-token scope
 * (defined in globals.css) and renders the global footer + floating social bar,
 * mirroring the zip's TanStack `__root` chrome.
 */
export function WaterIceShell({ children }: { children: ReactNode }) {
  return (
    <div className="wie-site min-h-screen bg-background">
      {children}
      <SiteFooter />
      <FloatingSocialBar />
    </div>
  );
}
