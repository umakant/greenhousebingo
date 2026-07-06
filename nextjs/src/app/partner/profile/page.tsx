import AuthenticatedLayout from "@/layouts/authenticated-layout";
import PartnerProfile from "@/components/partner/partner-profile";
import { requirePartnerPage } from "@/lib/require-partner-page";
import { t } from "@/lib/admin-t";


export default async function PartnerProfilePage() {
  const { user } = await requirePartnerPage();
  return (
    <AuthenticatedLayout user={user} breadcrumbs={[{ label: t("Profile Settings") }]} pageTitle={t("Profile Settings")}>
      <PartnerProfile mode="profile" />
    </AuthenticatedLayout>
  );
}
