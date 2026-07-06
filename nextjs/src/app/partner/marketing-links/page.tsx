import AuthenticatedLayout from "@/layouts/authenticated-layout";
import PartnerMarketingLinks from "@/components/partner/partner-marketing-links";
import { requirePartnerPage } from "@/lib/require-partner-page";
import { t } from "@/lib/admin-t";


export default async function PartnerMarketingLinksPage() {
  const { user, partner } = await requirePartnerPage();
  return (
    <AuthenticatedLayout user={user} breadcrumbs={[{ label: t("Marketing Links") }]} pageTitle={t("Marketing Links")}>
      <PartnerMarketingLinks slug={partner.slug} referralCode={partner.referralCode} />
    </AuthenticatedLayout>
  );
}
