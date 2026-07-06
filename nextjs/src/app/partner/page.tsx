import AuthenticatedLayout from "@/layouts/authenticated-layout";
import PartnerDashboard from "@/components/partner/partner-dashboard";
import { requirePartnerPage } from "@/lib/require-partner-page";
import { t } from "@/lib/admin-t";


export default async function PartnerHomePage() {
  const { user, partner } = await requirePartnerPage();
  return (
    <AuthenticatedLayout user={user} breadcrumbs={[{ label: t("Partner Dashboard") }]} pageTitle={t("Partner Dashboard")}>
      <PartnerDashboard slug={partner.slug} referralCode={partner.referralCode} />
    </AuthenticatedLayout>
  );
}
