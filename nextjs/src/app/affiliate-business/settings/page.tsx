import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { AffiliateSettingsAdminClient } from "@/components/affiliate-business/affiliate-settings-admin-client";
import { requireAffiliatePageAccess } from "@/lib/require-affiliate-page";
import { t } from "@/lib/admin-t";


export default async function AffiliateSettingsPage() {
  const user = await requireAffiliatePageAccess("/affiliate-business/settings", "manage-affiliate-settings");

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
        { label: t("Settings") },
      ]}
      pageTitle={t("Affiliate Settings")}
    >
      <AffiliateSettingsAdminClient />
    </AuthenticatedLayout>
  );
}
