import AuthenticatedLayout from "@/layouts/authenticated-layout";
import MyOrders from "@/components/marketplace/company/my-orders";
import { requireMarketplacePageAccess } from "@/lib/require-marketplace-page";
import { t } from "@/lib/admin-t";


export default async function MarketplaceMyOrdersPage() {
  const user = await requireMarketplacePageAccess("marketplace.orders.view");
  return (
    <AuthenticatedLayout
      user={user}
      breadcrumbs={[{ label: t("Marketplace"), url: "/marketplace/shop" }, { label: t("My Orders") }]}
      pageTitle={t("My Orders")}
    >
      <MyOrders />
    </AuthenticatedLayout>
  );
}
