import AuthenticatedLayout from "@/layouts/authenticated-layout";
import PartnerLandingPages from "@/components/partner/partner-landing-pages";
import { requirePartnerPage } from "@/lib/require-partner-page";
import { t } from "@/lib/admin-t";


export default async function PartnerLandingPagesPage() {
  const { user, partner } = await requirePartnerPage();
  return (
    <AuthenticatedLayout user={user} breadcrumbs={[{ label: t("Landing Pages") }]} pageTitle={t("Landing Pages")}>
      <PartnerLandingPages slug={partner.slug} />
    </AuthenticatedLayout>
  );
}
