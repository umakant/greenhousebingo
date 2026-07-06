"use client";

import type { ReactNode } from "react";

/**
 * Full-width storefront admin content (Shopify-style). Section switching uses the app sidebar;
 * we no longer duplicate Storefront sub-nav here.
 */
export function StorefrontMerchantShell({
  children,
}: {
  /** Kept for callers; unused — primary nav is the app sidebar. */
  currentSection?: string;
  permissions?: string[];
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 w-full">
      <div className="pt-0 md:pt-1">{children}</div>
    </div>
  );
}
