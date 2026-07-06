import AuthenticatedLayout from "@/layouts/authenticated-layout";
import PayoutsAdmin from "@/components/partnerships/payouts-admin";
import { requirePartnershipPage } from "@/lib/require-partnership-page";
import { t } from "@/lib/admin-t";


export default async function PartnershipPayoutsPage() {
  const user = await requirePartnershipPage();
  return (
    <AuthenticatedLayout
      user={user}
      breadcrumbs={[{ label: t("Partnerships"), url: "/partnerships" }, { label: t("Payouts") }]}
      pageTitle={t("Payouts")}
    >
      <PayoutsAdmin />
    </AuthenticatedLayout>
  );
}
