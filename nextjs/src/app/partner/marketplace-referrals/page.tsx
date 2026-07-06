import AuthenticatedLayout from "@/layouts/authenticated-layout";
import PartnerMarketplaceReferrals from "@/components/partner/partner-marketplace-referrals";
import { requirePartnerPage } from "@/lib/require-partner-page";
import { t } from "@/lib/admin-t";


export default async function PartnerMarketplaceReferralsPage() {
  const { user } = await requirePartnerPage();
  return (
    <AuthenticatedLayout
      user={user}
      breadcrumbs={[{ label: t("Marketplace Referrals") }]}
      pageTitle={t("Marketplace Referrals")}
    >
      <PartnerMarketplaceReferrals />
    </AuthenticatedLayout>
  );
}
