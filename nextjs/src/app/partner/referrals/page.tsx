import AuthenticatedLayout from "@/layouts/authenticated-layout";
import PartnerReferrals from "@/components/partner/partner-referrals";
import { requirePartnerPage } from "@/lib/require-partner-page";
import { t } from "@/lib/admin-t";


export default async function PartnerReferralsPage() {
  const { user } = await requirePartnerPage();
  return (
    <AuthenticatedLayout user={user} breadcrumbs={[{ label: t("My Referrals") }]} pageTitle={t("My Referrals")}>
      <PartnerReferrals />
    </AuthenticatedLayout>
  );
}
