import AuthenticatedLayout from "@/layouts/authenticated-layout";
import ProductsAdmin from "@/components/marketplace/admin/products-admin";
import { requireMarketplaceAdminPage } from "@/lib/require-marketplace-admin-page";
import { t } from "@/lib/admin-t";


export default async function MarketplaceProductsPage() {
  const user = await requireMarketplaceAdminPage("marketplace.vendor.view");
  return (
    <AuthenticatedLayout
      user={user}
      breadcrumbs={[{ label: t("Marketplace"), url: "/marketplace/admin" }, { label: t("Products") }]}
      pageTitle={t("Products")}
    >
      <ProductsAdmin canManage={user.permissions.includes("*") || user.permissions.includes("marketplace.vendor.manage") || user.permissions.includes("marketplace.manage")} />
    </AuthenticatedLayout>
  );
}
