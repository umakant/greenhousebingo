import AuthenticatedLayout from "@/layouts/authenticated-layout";
import DeliveryCityQueueAdmin from "@/components/marketplace/admin/delivery-city-queue-admin";
import { requireMarketplaceAdminPage } from "@/lib/require-marketplace-admin-page";
import { t } from "@/lib/admin-t";


export default async function AdminMarketplaceDeliveryQueuePage() {
  const user = await requireMarketplaceAdminPage("marketplace.delivery_queue.view");
  const perms = user.permissions;
  const canSchedule =
    perms.includes("*") ||
    perms.includes("marketplace.delivery_events.create") ||
    perms.includes("marketplace.manage");

  return (
    <AuthenticatedLayout
      user={user}
      breadcrumbs={[{ label: t("Marketplace"), url: "/admin/marketplace" }, { label: t("Delivery Queue") }]}
      pageTitle={t("Delivery Queue")}
    >
      <DeliveryCityQueueAdmin canSchedule={canSchedule} />
    </AuthenticatedLayout>
  );
}
