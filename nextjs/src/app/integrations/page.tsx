import { MarketingPageShell } from "@/components/MarketingPageShell";
import { PublicProductPage } from "@/components/landing/public-product-page";
import { requirePublicMarketingAccess } from "@/lib/public-marketing-access";
import { getProductPageContent } from "@/lib/public-product-pages-data";
import { getPublicPricingData } from "@/lib/public-pricing-data";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  const { enableRegistration } = await requirePublicMarketingAccess();
  const content = getProductPageContent("integrations");
  const { addOns } = await getPublicPricingData();

  return (
    <MarketingPageShell>
      <PublicProductPage content={content} addOns={addOns} enableRegistration={enableRegistration} />
    </MarketingPageShell>
  );
}
