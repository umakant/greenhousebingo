import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { EmAnalyticsClient } from "@/components/expense-management/em-analytics-client";
import { requireEmPageAccess } from "@/lib/require-em-page";
import { t } from "@/lib/admin-t";


export default async function ExpenseManagementAnalyticsPage() {
  const user = await requireEmPageAccess("/expense-management/analytics");

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
        { label: t("Expense Management"), url: "/expense-management" },
        { label: t("Analytics") },
      ]}
      pageTitle={t("Expense analytics")}
    >
      <EmAnalyticsClient />
    </AuthenticatedLayout>
  );
}
