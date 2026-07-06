import AuthenticatedLayout from "@/layouts/authenticated-layout";
import PartnerProfile from "@/components/partner/partner-profile";
import { requirePartnerPage } from "@/lib/require-partner-page";
import { t } from "@/lib/admin-t";


export default async function PartnerPayoutSettingsPage() {
  const { user } = await requirePartnerPage();
  return (
    <AuthenticatedLayout user={user} breadcrumbs={[{ label: t("Payout Settings") }]} pageTitle={t("Payout Settings")}>
      <PartnerProfile mode="payout" />
    </AuthenticatedLayout>
  );
}
