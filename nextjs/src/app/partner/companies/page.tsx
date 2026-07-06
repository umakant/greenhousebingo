import AuthenticatedLayout from "@/layouts/authenticated-layout";
import PartnerCompanies from "@/components/partner/partner-companies";
import { requirePartnerPage } from "@/lib/require-partner-page";
import { t } from "@/lib/admin-t";


export default async function PartnerCompaniesPage() {
  const { user } = await requirePartnerPage();
  return (
    <AuthenticatedLayout user={user} breadcrumbs={[{ label: t("My Companies") }]} pageTitle={t("My Companies")}>
      <PartnerCompanies />
    </AuthenticatedLayout>
  );
}
