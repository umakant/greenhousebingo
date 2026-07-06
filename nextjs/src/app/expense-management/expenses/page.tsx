import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { EmExpensesClient } from "@/components/expense-management/em-expenses-client";
import { requireEmPageAccess } from "@/lib/require-em-page";
import { t } from "@/lib/admin-t";


export default async function ExpenseManagementExpensesPage() {
  const user = await requireEmPageAccess("/expense-management/expenses");

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
        { label: t("Expenses") },
      ]}
      pageTitle={t("Expense lines")}
    >
      <EmExpensesClient
        permissions={user.permissions}
        roles={user.roles}
        userType={user.userType}
      />
    </AuthenticatedLayout>
  );
}
