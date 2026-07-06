import { redirect } from "next/navigation";

import { StorefrontAccountSignupClient } from "@/components/storefront/storefront-account-signup-client";
import { getStorefrontCustomerSessionForWebsite } from "@/lib/storefront-customer-server";

export default async function StorefrontAccountSignupPage({
  params,
}: {
  params: Promise<{ websiteId: string }>;
}) {
  const { websiteId } = await params;
  const existing = await getStorefrontCustomerSessionForWebsite(websiteId);
  if (existing) {
    redirect(`/storefront/account/w/${websiteId}/dashboard`);
  }
  return <StorefrontAccountSignupClient websiteId={websiteId} />;
}
