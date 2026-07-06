import AuthenticatedLayout from "@/layouts/authenticated-layout";
import PartnerMarketplaceCommissions from "@/components/partner/partner-marketplace-commissions";
import { requirePartnerPage } from "@/lib/require-partner-page";
import { t } from "@/lib/admin-t";


export default async function PartnerMarketplaceCommissionsPage() {
  const { user } = await requirePartnerPage();
  return (
    <AuthenticatedLayout
      user={user}
      breadcrumbs={[{ label: t("Marketplace Commissions") }]}
      pageTitle={t("Marketplace Commissions")}
    >
      <PartnerMarketplaceCommissions />
    </AuthenticatedLayout>
  );
}
