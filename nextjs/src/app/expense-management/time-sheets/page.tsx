import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { EmTimeSheetsClient } from "@/components/expense-management/em-time-sheets-client";
import { requireEmPageAccess } from "@/lib/require-em-page";
import { t } from "@/lib/admin-t";


export default async function ExpenseManagementTimeSheetsPage() {
  const user = await requireEmPageAccess("/expense-management/time-sheets");

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
        { label: t("Time Sheets") },
      ]}
      pageTitle={t("Operations Workspace")}
    >
      <EmTimeSheetsClient />
    </AuthenticatedLayout>
  );
}
