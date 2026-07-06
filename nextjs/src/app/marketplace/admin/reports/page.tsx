import AuthenticatedLayout from "@/layouts/authenticated-layout";
import MarketplaceReports from "@/components/marketplace/admin/marketplace-reports";
import { requireMarketplaceAdminPage } from "@/lib/require-marketplace-admin-page";
import { t } from "@/lib/admin-t";


export default async function MarketplaceReportsPage() {
  const user = await requireMarketplaceAdminPage("marketplace.reports.view");
  return (
    <AuthenticatedLayout
      user={user}
      breadcrumbs={[{ label: t("Marketplace"), url: "/marketplace/admin" }, { label: t("Reports") }]}
      pageTitle={t("Reports")}
    >
      <MarketplaceReports />
    </AuthenticatedLayout>
  );
}
