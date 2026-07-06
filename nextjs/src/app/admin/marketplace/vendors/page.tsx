import AuthenticatedLayout from "@/layouts/authenticated-layout";
import VendorsAdmin from "@/components/marketplace/admin/vendors-admin";
import { requireMarketplaceAdminPage } from "@/lib/require-marketplace-admin-page";
import { t } from "@/lib/admin-t";


export default async function AdminMarketplaceVendorsPage() {
  const user = await requireMarketplaceAdminPage("marketplace.vendor.view");
  const perms = user.permissions;
  return (
    <AuthenticatedLayout
      user={user}
      breadcrumbs={[{ label: t("Marketplace"), url: "/admin/marketplace" }, { label: t("Vendors") }]}
      pageTitle={t("Vendors")}
    >
      <VendorsAdmin
        canManage={perms.includes("*") || perms.includes("marketplace.vendor.manage") || perms.includes("marketplace.manage")}
      />
    </AuthenticatedLayout>
  );
}
