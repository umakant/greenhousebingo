"use client";

import { StorefrontMerchantSectionPanels } from "@/components/storefront/storefront-merchant-section-panels";

export function StorefrontSectionContent({ section }: { section: string }) {
  return <StorefrontMerchantSectionPanels section={section} />;
}
