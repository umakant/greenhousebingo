import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { AffiliateProgramsAdminClient } from "@/components/affiliate-business/affiliate-programs-admin-client";
import { requireAffiliatePageAccess } from "@/lib/require-affiliate-page";
import { t } from "@/lib/admin-t";


export default async function AffiliateProgramsPage() {
  const user = await requireAffiliatePageAccess("/affiliate-business/programs", "manage-affiliate-programs");

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
        { label: t("Programs") },
      ]}
      pageTitle={t("Manage Programs")}
    >
      <AffiliateProgramsAdminClient />
    </AuthenticatedLayout>
  );
}
