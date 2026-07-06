import type { Metadata } from "next";
import { PricingContent } from "@/components/pricing/PricingContent";

export const metadata: Metadata = {
  title: "Pricing — Paper Flight",
  description:
    "Try any Paper Flight plan free for 14 days. Switch between Starter, Growing and Premium anytime.",
  openGraph: {
    title: "Paper Flight Pricing",
    description: "Plans for every stage of your service business.",
  },
};

export default function PricingPage() {
  return <PricingContent />;
}
