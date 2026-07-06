import AuthenticatedLayout from "@/layouts/authenticated-layout";
import OrdersAdmin from "@/components/marketplace/admin/orders-admin";
import { hasPermission } from "@/lib/authz";
import { requireMarketplaceVendorPage } from "@/lib/require-marketplace-vendor-page";
import { t } from "@/lib/admin-t";


export default async function MarketplaceVendorOrdersPage() {
  const user = await requireMarketplaceVendorPage("marketplace.vendor_portal.orders.view");
  const perms = user.permissions;
  const canManage = hasPermission(perms, "marketplace.vendor_portal.orders.update_status");

  return (
    <AuthenticatedLayout
      user={user}
      breadcrumbs={[{ label: t("Vendor Portal"), url: "/marketplace/vendor" }, { label: t("Orders") }]}
      pageTitle={t("Orders")}
    >
      <OrdersAdmin
        canManage={canManage}
        canCreateEvents={false}
        apiBase="/api/marketplace/vendor"
        vendorMode
      />
    </AuthenticatedLayout>
  );
}
