import { notFound } from "next/navigation";

import { MarketingPageShell } from "@/components/MarketingPageShell";
import { PublicComparePage } from "@/components/landing/public-compare-page";
import { requirePublicMarketingAccess } from "@/lib/public-marketing-access";
import {
  getComparePageContent,
  isComparePageSlug,
  type ComparePageSlug,
} from "@/lib/public-compare-pages-data";

export async function renderMarketingComparePage(slug: ComparePageSlug) {
  const { enableRegistration } = await requirePublicMarketingAccess();
  const content = getComparePageContent(slug);

  return (
    <MarketingPageShell>
      <PublicComparePage content={content} enableRegistration={enableRegistration} />
    </MarketingPageShell>
  );
}

export async function renderMarketingComparePageFromParam(slug: string) {
  if (!isComparePageSlug(slug)) notFound();
  return renderMarketingComparePage(slug);
}
