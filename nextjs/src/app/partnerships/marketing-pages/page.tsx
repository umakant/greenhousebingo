import AuthenticatedLayout from "@/layouts/authenticated-layout";
import MarketingPagesAdmin from "@/components/partnerships/marketing-pages-admin";
import { requirePartnershipPage } from "@/lib/require-partnership-page";
import { t } from "@/lib/admin-t";


export default async function MarketingPagesPage() {
  const user = await requirePartnershipPage();
  return (
    <AuthenticatedLayout
      user={user}
      breadcrumbs={[{ label: t("Partnerships"), url: "/partnerships" }, { label: t("Marketing Pages") }]}
      pageTitle={t("Marketing Pages")}
    >
      <MarketingPagesAdmin />
    </AuthenticatedLayout>
  );
}
