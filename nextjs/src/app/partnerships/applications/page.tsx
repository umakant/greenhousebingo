import AuthenticatedLayout from "@/layouts/authenticated-layout";
import PartnerApplications from "@/components/partnerships/partner-applications";
import { requirePartnershipPage } from "@/lib/require-partnership-page";
import { t } from "@/lib/admin-t";


export default async function PartnerApplicationsPage() {
  const user = await requirePartnershipPage();
  return (
    <AuthenticatedLayout
      user={user}
      breadcrumbs={[{ label: t("Partnerships"), url: "/partnerships" }, { label: t("Partner Applications") }]}
      pageTitle={t("Partner Applications")}
    >
      <PartnerApplications />
    </AuthenticatedLayout>
  );
}
