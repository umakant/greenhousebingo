import AuthenticatedLayout from "@/layouts/authenticated-layout";
import MarketplaceBrowse from "@/components/marketplace/company/marketplace-browse";
import { requireMarketplacePageAccess } from "@/lib/require-marketplace-page";
import { t } from "@/lib/admin-t";


export default async function MarketplaceShopPage() {
  const user = await requireMarketplacePageAccess("marketplace.view");
  const canOrder =
    user.permissions.includes("*") ||
    user.permissions.includes("marketplace.manage") ||
    user.permissions.includes("marketplace.orders.manage");
  return (
    <AuthenticatedLayout
      user={user}
      breadcrumbs={[{ label: t("Marketplace") }]}
      pageTitle={t("Marketplace")}
    >
      <MarketplaceBrowse canOrder={canOrder} />
    </AuthenticatedLayout>
  );
}
