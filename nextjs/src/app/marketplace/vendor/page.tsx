import { redirect } from "next/navigation";

import AuthenticatedLayout from "@/layouts/authenticated-layout";
import VendorDashboard from "@/components/marketplace/vendor/vendor-dashboard";
import { requireMarketplaceVendorPage } from "@/lib/require-marketplace-vendor-page";
import { t } from "@/lib/admin-t";


export default async function MarketplaceVendorDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>;
}) {
  const user = await requireMarketplaceVendorPage("marketplace.vendor_portal.dashboard.view");
  const params = await searchParams;
  if (user.forcePasswordReset || params.reset === "1") {
    redirect("/marketplace/vendor/profile?reset=1");
  }

  return (
    <AuthenticatedLayout
      user={user}
      breadcrumbs={[{ label: t("Vendor Portal") }, { label: t("Dashboard") }]}
      pageTitle={t("Vendor Dashboard")}
    >
      <VendorDashboard />
    </AuthenticatedLayout>
  );
}
