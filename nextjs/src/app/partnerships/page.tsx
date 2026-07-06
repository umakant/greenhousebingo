import AuthenticatedLayout from "@/layouts/authenticated-layout";
import PartnershipsOverview from "@/components/partnerships/partnerships-overview";
import { requirePartnershipPage } from "@/lib/require-partnership-page";
import { t } from "@/lib/admin-t";


export default async function PartnershipsOverviewPage() {
  const user = await requirePartnershipPage();
  return (
    <AuthenticatedLayout
      user={user}
      breadcrumbs={[{ label: t("Partnerships") }]}
      pageTitle={t("Partnerships Overview")}
    >
      <PartnershipsOverview />
    </AuthenticatedLayout>
  );
}
