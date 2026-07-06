import AuthenticatedLayout from "@/layouts/authenticated-layout";
import ReferralLinksAdmin from "@/components/partnerships/referral-links-admin";
import { requirePartnershipPage } from "@/lib/require-partnership-page";
import { t } from "@/lib/admin-t";


export default async function ReferralLinksPage() {
  const user = await requirePartnershipPage();
  return (
    <AuthenticatedLayout
      user={user}
      breadcrumbs={[{ label: t("Partnerships"), url: "/partnerships" }, { label: t("Referral Links") }]}
      pageTitle={t("Referral Links")}
    >
      <ReferralLinksAdmin />
    </AuthenticatedLayout>
  );
}
