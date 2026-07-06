import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { ComplianceDashboardClient } from "@/components/compliance/compliance-dashboard-client";
import { requireCompliancePageAccess } from "@/lib/require-compliance-page";
import { t } from "@/lib/admin-t";

export default async function ComplianceOverviewPage() {
  const user = await requireCompliancePageAccess("/compliance");

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
      breadcrumbs={[{ label: t("Dashboard"), url: "/dashboard" }, { label: t("Compliance Dashboard") }]}
    >
      <ComplianceDashboardClient />
    </AuthenticatedLayout>
  );
}
