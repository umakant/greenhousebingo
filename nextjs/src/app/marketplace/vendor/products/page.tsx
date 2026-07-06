import AuthenticatedLayout from "@/layouts/authenticated-layout";
import ProductsAdmin from "@/components/marketplace/admin/products-admin";
import { hasPermission } from "@/lib/authz";
import { requireMarketplaceVendorPage } from "@/lib/require-marketplace-vendor-page";
import { t } from "@/lib/admin-t";


export default async function MarketplaceVendorProductsPage() {
  const user = await requireMarketplaceVendorPage("marketplace.vendor_portal.products.view");
  const perms = user.permissions;
  const canManage =
    hasPermission(perms, "marketplace.vendor_portal.products.create") ||
    hasPermission(perms, "marketplace.vendor_portal.products.edit") ||
    hasPermission(perms, "marketplace.vendor_portal.products.delete");

  return (
    <AuthenticatedLayout
      user={user}
      breadcrumbs={[{ label: t("Vendor Portal"), url: "/marketplace/vendor" }, { label: t("Products") }]}
      pageTitle={t("Products")}
    >
      <ProductsAdmin canManage={canManage} apiBase="/api/marketplace/vendor" vendorMode />
    </AuthenticatedLayout>
  );
}
