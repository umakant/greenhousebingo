import { getStorefrontCustomerSessionForWebsite } from "@/lib/storefront-customer-server";
import { StorefrontAccountDashboardClient } from "@/components/storefront/storefront-account-dashboard-client";

export default async function StorefrontAccountDashboardPage({
  params,
}: {
  params: Promise<{ websiteId: string }>;
}) {
  const { websiteId } = await params;
  const ctx = await getStorefrontCustomerSessionForWebsite(websiteId);
  if (!ctx) return null;

  return <StorefrontAccountDashboardClient websiteId={websiteId} email={ctx.email} name={ctx.name} />;
}
