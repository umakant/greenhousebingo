import AuthenticatedLayout from "@/layouts/authenticated-layout";
import DeliveryQueuesAdmin from "@/components/marketplace/admin/delivery-queues-admin";
import { requireMarketplaceAdminPage } from "@/lib/require-marketplace-admin-page";
import { t } from "@/lib/admin-t";


export default async function AdminMarketplaceDeliveryMapPage() {
  const user = await requireMarketplaceAdminPage("marketplace.delivery_queue.view");
  const perms = user.permissions;
  const canManage =
    perms.includes("*") ||
    perms.includes("marketplace.delivery_queue.manage") ||
    perms.includes("marketplace.delivery_events.create") ||
    perms.includes("marketplace.manage");

  return (
    <AuthenticatedLayout
      user={user}
      breadcrumbs={[{ label: t("Marketplace"), url: "/admin/marketplace" }, { label: t("Delivery Map") }]}
      pageTitle={t("Delivery Map")}
    >
      <DeliveryQueuesAdmin canManage={canManage} />
    </AuthenticatedLayout>
  );
}
