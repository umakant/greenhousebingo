import type { ReactNode } from "react";
import { SiteFooter } from "@/components/greenhouse-bingo/site-footer";
import { SiteHeader } from "@/components/greenhouse-bingo/site-header";

export function GhBingoShell({ children }: { children: ReactNode }) {
  return (
    <div className="gh-bingo-site flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
