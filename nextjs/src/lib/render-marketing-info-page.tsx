import { MarketingPageShell } from "@/components/MarketingPageShell";
import { PublicInfoPage } from "@/components/landing/public-info-page";
import { requirePublicMarketingAccess } from "@/lib/public-marketing-access";
import { getInfoPageContent, type InfoPageSlug } from "@/lib/public-info-pages-data";

export async function renderMarketingInfoPage(slug: InfoPageSlug) {
  const { enableRegistration } = await requirePublicMarketingAccess();
  const content = getInfoPageContent(slug);

  return (
    <MarketingPageShell>
      <PublicInfoPage content={content} enableRegistration={enableRegistration} />
    </MarketingPageShell>
  );
}
