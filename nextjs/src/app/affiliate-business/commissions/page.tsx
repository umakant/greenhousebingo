import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { AffiliateCommissionsAdminClient } from "@/components/affiliate-business/affiliate-commissions-admin-client";
import { requireAffiliatePageAccess } from "@/lib/require-affiliate-page";
import { t } from "@/lib/admin-t";


export default async function AffiliateCommissionsPage() {
  const user = await requireAffiliatePageAccess("/affiliate-business/commissions", "manage-affiliate-commissions");

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
        { label: t("Commissions") },
      ]}
      pageTitle={t("Manage Commissions")}
    >
      <AffiliateCommissionsAdminClient />
    </AuthenticatedLayout>
  );
}
