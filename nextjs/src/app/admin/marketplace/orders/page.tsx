import AuthenticatedLayout from "@/layouts/authenticated-layout";
import OrdersAdmin from "@/components/marketplace/admin/orders-admin";
import { requireMarketplaceAdminPage } from "@/lib/require-marketplace-admin-page";
import { t } from "@/lib/admin-t";


export default async function AdminMarketplaceOrdersPage() {
  const user = await requireMarketplaceAdminPage("marketplace.orders.view");
  const perms = user.permissions;
  return (
    <AuthenticatedLayout
      user={user}
      breadcrumbs={[{ label: t("Marketplace"), url: "/admin/marketplace" }, { label: t("Orders") }]}
      pageTitle={t("Orders")}
    >
      <OrdersAdmin
        canManage={perms.includes("*") || perms.includes("marketplace.orders.manage") || perms.includes("marketplace.manage")}
        canCreateEvents={perms.includes("*") || perms.includes("marketplace.delivery_events.create") || perms.includes("marketplace.manage")}
      />
    </AuthenticatedLayout>
  );
}
