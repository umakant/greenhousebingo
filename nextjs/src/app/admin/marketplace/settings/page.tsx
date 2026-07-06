import AuthenticatedLayout from "@/layouts/authenticated-layout";
import MarketplaceSettingsForm from "@/components/marketplace/admin/marketplace-settings-form";
import { requireMarketplaceAdminPage } from "@/lib/require-marketplace-admin-page";
import { t } from "@/lib/admin-t";


export default async function AdminMarketplaceSettingsPage() {
  const user = await requireMarketplaceAdminPage("marketplace.settings.manage");
  return (
    <AuthenticatedLayout
      user={user}
      breadcrumbs={[{ label: t("Marketplace"), url: "/admin/marketplace" }, { label: t("Settings") }]}
      pageTitle={t("Marketplace Settings")}
    >
      <MarketplaceSettingsForm />
    </AuthenticatedLayout>
  );
}
