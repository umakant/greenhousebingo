import AuthenticatedLayout from "@/layouts/authenticated-layout";
import OwnershipPartnersAdmin from "@/components/ownership/ownership-partners-admin";
import { requirePartnershipPage } from "@/lib/require-partnership-page";
import { t } from "@/lib/admin-t";


export default async function PartnersPage() {
  const user = await requirePartnershipPage();
  return (
    <AuthenticatedLayout
      user={user}
      breadcrumbs={[{ label: t("Partnerships"), url: "/partnerships" }, { label: t("Partners") }]}
      pageTitle={t("Partners")}
    >
      <OwnershipPartnersAdmin />
    </AuthenticatedLayout>
  );
}
