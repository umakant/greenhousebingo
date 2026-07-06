import { redirect } from "next/navigation";

import { getStorefrontCustomerSessionForWebsite } from "@/lib/storefront-customer-server";

/**
 * Storefront customer area only — uses `sfc_session`, not staff `pf_*`.
 * Staff must use the main app login; they only see this UI if linked as a `StorefrontCustomer`.
 */
export default async function StorefrontAccountProtectedLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ websiteId: string }>;
}) {
  const { websiteId } = await params;
  const ctx = await getStorefrontCustomerSessionForWebsite(websiteId);
  if (!ctx) {
    redirect(`/storefront/account/w/${websiteId}/login`);
  }
  return <>{children}</>;
}
