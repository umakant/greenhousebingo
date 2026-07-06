import { MarketingPageShell } from "@/components/MarketingPageShell";
import { PublicProductPage } from "@/components/landing/public-product-page";
import { requirePublicMarketingAccess } from "@/lib/public-marketing-access";
import { getProductPageContent } from "@/lib/public-product-pages-data";

export const dynamic = "force-dynamic";

export default async function FeaturesPage() {
  const { enableRegistration } = await requirePublicMarketingAccess();
  const content = getProductPageContent("features");

  return (
    <MarketingPageShell>
      <PublicProductPage content={content} enableRegistration={enableRegistration} />
    </MarketingPageShell>
  );
}
