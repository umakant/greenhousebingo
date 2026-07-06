import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { EmDashboardClient } from "@/components/expense-management/em-dashboard-client";
import { requireEmPageAccess } from "@/lib/require-em-page";
import { t } from "@/lib/admin-t";


export default async function ExpenseManagementDashboardPage() {
  const user = await requireEmPageAccess("/expense-management");

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
        { label: t("Dashboard") },
      ]}
      pageTitle={t("Expense Management Dashboard")}
    >
      <EmDashboardClient />
    </AuthenticatedLayout>
  );
}
