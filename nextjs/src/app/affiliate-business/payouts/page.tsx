import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { AffiliatePayoutsAdminClient } from "@/components/affiliate-business/affiliate-payouts-admin-client";
import { requireAffiliatePageAccess } from "@/lib/require-affiliate-page";
import { t } from "@/lib/admin-t";


export default async function AffiliatePayoutsPage() {
  const user = await requireAffiliatePageAccess("/affiliate-business/payouts", "manage-affiliate-payouts");

  return (
    <AuthenticatedLayout
      user={{
        name: user.name,
        email: user.email,
        roles: user.roles,
        permissions: user.permissions,
        activatedPackages: user.activatedPackages,
        primaryRole: user.primaryRole,
      }}
      breadcrumbs={[
        { label: t("Affiliate Business"), url: "/affiliate-business" },
        { label: t("Payouts") },
      ]}
      pageTitle={t("Manage Payouts")}
    >
      <AffiliatePayoutsAdminClient />
    </AuthenticatedLayout>
  );
}
