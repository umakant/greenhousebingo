import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { AffiliateAnalyticsAdminClient } from "@/components/affiliate-business/affiliate-analytics-admin-client";
import { requireAffiliatePageAccess } from "@/lib/require-affiliate-page";
import { t } from "@/lib/admin-t";


export default async function AffiliateAnalyticsPage() {
  const user = await requireAffiliatePageAccess("/affiliate-business/analytics", "manage-affiliate-analytics");

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
        { label: t("Analytics") },
      ]}
      pageTitle={t("Affiliate Analytics")}
    >
      <AffiliateAnalyticsAdminClient />
    </AuthenticatedLayout>
  );
}
