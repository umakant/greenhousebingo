import AuthenticatedLayout from "@/layouts/authenticated-layout";
import PartnerDetail from "@/components/partnerships/partner-detail";
import { requirePartnershipPage } from "@/lib/require-partnership-page";
import { t } from "@/lib/admin-t";


export default async function PartnerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePartnershipPage();
  const { id } = await params;
  return (
    <AuthenticatedLayout
      user={user}
      breadcrumbs={[
        { label: t("Partnerships"), url: "/partnerships" },
        { label: t("Partners"), url: "/partnerships/partners" },
        { label: t("Detail") },
      ]}
      pageTitle={t("Partner Detail")}
    >
      <PartnerDetail partnerId={id} />
    </AuthenticatedLayout>
  );
}
