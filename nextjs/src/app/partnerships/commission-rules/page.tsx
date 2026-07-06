import AuthenticatedLayout from "@/layouts/authenticated-layout";
import CommissionRulesAdmin from "@/components/partnerships/commission-rules-admin";
import { requirePartnershipPage } from "@/lib/require-partnership-page";
import { t } from "@/lib/admin-t";


export default async function CommissionRulesPage() {
  const user = await requirePartnershipPage();
  return (
    <AuthenticatedLayout
      user={user}
      breadcrumbs={[{ label: t("Partnerships"), url: "/partnerships" }, { label: t("Commission Rules") }]}
      pageTitle={t("Commission Rules")}
    >
      <CommissionRulesAdmin />
    </AuthenticatedLayout>
  );
}
