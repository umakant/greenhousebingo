import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { AffiliateBusinessDashboardClient } from "@/components/affiliate-business/affiliate-business-dashboard-client";
import { requireAffiliatePageAccess } from "@/lib/require-affiliate-page";
import { t } from "@/lib/admin-t";


export default async function AffiliateBusinessDashboardPage() {
  const user = await requireAffiliatePageAccess("/affiliate-business", "manage-affiliate-business-dashboard");

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
        { label: t("Dashboard") },
      ]}
      pageTitle={t("Affiliate Business Dashboard")}
    >
      <AffiliateBusinessDashboardClient />
    </AuthenticatedLayout>
  );
}
