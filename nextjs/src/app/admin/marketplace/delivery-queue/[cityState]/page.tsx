import AuthenticatedLayout from "@/layouts/authenticated-layout";
import CityQueueDetail from "@/components/marketplace/admin/city-queue-detail";
import { requireMarketplaceAdminPage } from "@/lib/require-marketplace-admin-page";
import { t } from "@/lib/admin-t";


export default async function AdminMarketplaceCityQueuePage({
  params,
}: {
  params: Promise<{ cityState: string }>;
}) {
  const user = await requireMarketplaceAdminPage("marketplace.delivery_queue.view");
  const { cityState } = await params;
  const perms = user.permissions;
  const canSchedule =
    perms.includes("*") ||
    perms.includes("marketplace.delivery_events.create") ||
    perms.includes("marketplace.manage");

  return (
    <AuthenticatedLayout
      user={user}
      breadcrumbs={[
        { label: t("Marketplace"), url: "/admin/marketplace" },
        { label: t("Delivery Queue"), url: "/admin/marketplace/delivery-queue" },
        { label: t("City") },
      ]}
      pageTitle={t("City Delivery Queue")}
    >
      <CityQueueDetail param={cityState} canSchedule={canSchedule} />
    </AuthenticatedLayout>
  );
}
