import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { AffiliatePartnersAdminClient } from "@/components/affiliate-business/affiliate-partners-admin-client";
import { requireAffiliatePageAccess } from "@/lib/require-affiliate-page";
import { t } from "@/lib/admin-t";


export default async function AffiliatePartnersPage() {
  const user = await requireAffiliatePageAccess("/affiliate-business/partners", "manage-affiliate-partners");

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
        { label: t("Partners") },
      ]}
      pageTitle={t("Manage Partners")}
    >
      <AffiliatePartnersAdminClient />
    </AuthenticatedLayout>
  );
}
