import AuthenticatedLayout from "@/layouts/authenticated-layout";
import OwnershipHistoryAdmin from "@/components/ownership/ownership-history-admin";
import { requirePartnershipPage } from "@/lib/require-partnership-page";
import { t } from "@/lib/admin-t";


export default async function PartnershipOwnershipHistoryPage() {
  const user = await requirePartnershipPage();
  return (
    <AuthenticatedLayout
      user={user}
      breadcrumbs={[
        { label: t("Partnerships"), url: "/partnerships" },
        { label: t("Ownership History") },
      ]}
      pageTitle={t("Ownership History")}
    >
      <OwnershipHistoryAdmin />
    </AuthenticatedLayout>
  );
}
