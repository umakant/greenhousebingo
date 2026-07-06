import AuthenticatedLayout from "@/layouts/authenticated-layout";
import OwnershipRequestsAdmin from "@/components/ownership/ownership-requests-admin";
import { requirePartnershipPage } from "@/lib/require-partnership-page";
import { t } from "@/lib/admin-t";


export default async function PartnershipOwnershipRequestsPage() {
  const user = await requirePartnershipPage();
  return (
    <AuthenticatedLayout
      user={user}
      breadcrumbs={[
        { label: t("Partnerships"), url: "/partnerships" },
        { label: t("Ownership Requests") },
      ]}
      pageTitle={t("Ownership Requests")}
    >
      <OwnershipRequestsAdmin />
    </AuthenticatedLayout>
  );
}
