import AuthenticatedLayout from "@/layouts/authenticated-layout";
import VendorsAdmin from "@/components/marketplace/admin/vendors-admin";
import { requireMarketplaceAdminPage } from "@/lib/require-marketplace-admin-page";
import { t } from "@/lib/admin-t";


export default async function MarketplaceVendorsPage() {
  const user = await requireMarketplaceAdminPage("marketplace.vendor.view");
  return (
    <AuthenticatedLayout
      user={user}
      breadcrumbs={[{ label: t("Marketplace"), url: "/marketplace/admin" }, { label: t("Vendors") }]}
      pageTitle={t("Vendors")}
    >
      <VendorsAdmin canManage={user.permissions.includes("*") || user.permissions.includes("marketplace.vendor.manage") || user.permissions.includes("marketplace.manage")} />
    </AuthenticatedLayout>
  );
}
