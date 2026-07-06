import AuthenticatedLayout from "@/layouts/authenticated-layout";
import DeliveryEventsAdmin from "@/components/marketplace/admin/delivery-events-admin";
import { requireMarketplaceVendorPage } from "@/lib/require-marketplace-vendor-page";
import { t } from "@/lib/admin-t";


export default async function MarketplaceVendorDeliveryEventsPage() {
  const user = await requireMarketplaceVendorPage("marketplace.vendor_portal.delivery_queue.view");

  return (
    <AuthenticatedLayout
      user={user}
      breadcrumbs={[{ label: t("Vendor Portal"), url: "/marketplace/vendor" }, { label: t("Delivery Events") }]}
      pageTitle={t("Delivery Events")}
    >
      <DeliveryEventsAdmin canSchedule={false} apiBase="/api/marketplace/vendor" />
    </AuthenticatedLayout>
  );
}
