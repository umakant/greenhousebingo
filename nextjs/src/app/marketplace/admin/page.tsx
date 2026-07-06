import AuthenticatedLayout from "@/layouts/authenticated-layout";
import MarketplaceOverview from "@/components/marketplace/admin/marketplace-overview";
import { requireMarketplaceAdminPage } from "@/lib/require-marketplace-admin-page";
import { t } from "@/lib/admin-t";


export default async function MarketplaceAdminDashboardPage() {
  const user = await requireMarketplaceAdminPage("marketplace.view");
  return (
    <AuthenticatedLayout
      user={user}
      breadcrumbs={[{ label: t("Marketplace"), url: "/marketplace/admin" }, { label: t("Dashboard") }]}
      pageTitle={t("Marketplace Dashboard")}
    >
      <MarketplaceOverview />
    </AuthenticatedLayout>
  );
}
