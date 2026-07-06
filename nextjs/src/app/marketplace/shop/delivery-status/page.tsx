import AuthenticatedLayout from "@/layouts/authenticated-layout";
import DeliveryStatus from "@/components/marketplace/company/delivery-status";
import { requireMarketplacePageAccess } from "@/lib/require-marketplace-page";
import { t } from "@/lib/admin-t";


export default async function MarketplaceDeliveryStatusPage() {
  const user = await requireMarketplacePageAccess("marketplace.orders.view");
  return (
    <AuthenticatedLayout
      user={user}
      breadcrumbs={[{ label: t("Marketplace"), url: "/marketplace/shop" }, { label: t("Delivery Status") }]}
      pageTitle={t("Delivery Status")}
    >
      <DeliveryStatus />
    </AuthenticatedLayout>
  );
}
