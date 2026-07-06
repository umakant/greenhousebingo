import AuthenticatedLayout from "@/layouts/authenticated-layout";
import BrandsAdmin from "@/components/ownership/brands-admin";
import { requirePartnershipPage } from "@/lib/require-partnership-page";
import { t } from "@/lib/admin-t";


export default async function PartnershipBrandsPage() {
  const user = await requirePartnershipPage();
  return (
    <AuthenticatedLayout
      user={user}
      breadcrumbs={[
        { label: t("Partnerships"), url: "/partnerships" },
        { label: t("Brands") },
      ]}
      pageTitle={t("Brands")}
    >
      <BrandsAdmin />
    </AuthenticatedLayout>
  );
}
