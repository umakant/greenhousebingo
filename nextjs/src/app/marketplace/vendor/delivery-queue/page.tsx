import AuthenticatedLayout from "@/layouts/authenticated-layout";
import DeliveryCityQueueAdmin from "@/components/marketplace/admin/delivery-city-queue-admin";
import { hasPermission } from "@/lib/authz";
import { requireMarketplaceVendorPage } from "@/lib/require-marketplace-vendor-page";
import { t } from "@/lib/admin-t";


export default async function MarketplaceVendorDeliveryQueuePage() {
  const user = await requireMarketplaceVendorPage("marketplace.vendor_portal.delivery_queue.view");
  const canSchedule = hasPermission(user.permissions, "marketplace.vendor_portal.delivery.assign");

  return (
    <AuthenticatedLayout
      user={user}
      breadcrumbs={[{ label: t("Vendor Portal"), url: "/marketplace/vendor" }, { label: t("Delivery Queue") }]}
      pageTitle={t("Delivery Queue")}
    >
      <DeliveryCityQueueAdmin canSchedule={canSchedule} apiBase="/api/marketplace/vendor" />
    </AuthenticatedLayout>
  );
}
