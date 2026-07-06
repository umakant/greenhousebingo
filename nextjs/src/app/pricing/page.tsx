import type { Metadata } from "next";

import { MarketingPageShell } from "@/components/MarketingPageShell";
import { PricingContent } from "@/components/pricing/PricingContent";
import { requirePublicMarketingAccess } from "@/lib/public-marketing-access";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pricing — Paper Flight",
  description:
    "Try any Paper Flight plan free for 14 days. Switch between Monthly, Annual, and Lifetime anytime.",
  openGraph: {
    title: "Paper Flight Pricing",
    description: "Plans for every stage of your service business.",
  },
};

export default async function PricingPage() {
  await requirePublicMarketingAccess();

  return (
    <MarketingPageShell>
      <PricingContent />
    </MarketingPageShell>
  );
}
