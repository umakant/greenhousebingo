import AuthenticatedLayout from "@/layouts/authenticated-layout";
import MarketplaceReports from "@/components/marketplace/admin/marketplace-reports";
import { requireMarketplaceVendorPage } from "@/lib/require-marketplace-vendor-page";
import { t } from "@/lib/admin-t";


export default async function MarketplaceVendorReportsPage() {
  const user = await requireMarketplaceVendorPage("marketplace.vendor_portal.reports.view");

  return (
    <AuthenticatedLayout
      user={user}
      breadcrumbs={[{ label: t("Vendor Portal"), url: "/marketplace/vendor" }, { label: t("Reports") }]}
      pageTitle={t("Reports")}
    >
      <MarketplaceReports
        apiBase="/api/marketplace/vendor"
        topItemsLabel="Top products"
        topItemsColumn="Product"
      />
    </AuthenticatedLayout>
  );
}
