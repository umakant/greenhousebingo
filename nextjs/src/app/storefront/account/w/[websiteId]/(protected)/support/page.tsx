import { getStorefrontCustomerSessionForWebsite } from "@/lib/storefront-customer-server";
import { StorefrontAccountSupportClient } from "@/components/storefront/storefront-account-support-client";

export default async function StorefrontAccountSupportPage({
  params,
}: {
  params: Promise<{ websiteId: string }>;
}) {
  const { websiteId } = await params;
  const ctx = await getStorefrontCustomerSessionForWebsite(websiteId);
  if (!ctx) return null;

  return <StorefrontAccountSupportClient websiteId={websiteId} email={ctx.email} />;
}
