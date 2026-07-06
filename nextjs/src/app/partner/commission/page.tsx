import AuthenticatedLayout from "@/layouts/authenticated-layout";
import PartnerCommission from "@/components/partner/partner-commission";
import { requirePartnerPage } from "@/lib/require-partner-page";
import { t } from "@/lib/admin-t";


export default async function PartnerCommissionPage() {
  const { user } = await requirePartnerPage();
  return (
    <AuthenticatedLayout user={user} breadcrumbs={[{ label: t("My Commission") }]} pageTitle={t("My Commission")}>
      <PartnerCommission />
    </AuthenticatedLayout>
  );
}
