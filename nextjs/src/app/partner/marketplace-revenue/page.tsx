import AuthenticatedLayout from "@/layouts/authenticated-layout";
import PartnerMarketplaceRevenue from "@/components/partner/partner-marketplace-revenue";
import { requirePartnerPage } from "@/lib/require-partner-page";
import { t } from "@/lib/admin-t";


export default async function PartnerMarketplaceRevenuePage() {
  const { user } = await requirePartnerPage();
  return (
    <AuthenticatedLayout
      user={user}
      breadcrumbs={[{ label: t("Marketplace Revenue") }]}
      pageTitle={t("Marketplace Revenue")}
    >
      <PartnerMarketplaceRevenue />
    </AuthenticatedLayout>
  );
}
