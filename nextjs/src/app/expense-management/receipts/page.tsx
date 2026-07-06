import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { EmReceiptsClient } from "@/components/expense-management/em-receipts-client";
import { requireEmPageAccess } from "@/lib/require-em-page";
import { t } from "@/lib/admin-t";


export default async function ExpenseManagementReceiptsPage() {
  const user = await requireEmPageAccess("/expense-management/receipts");

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
        { label: t("Receipts") },
      ]}
      pageTitle={t("Receipts")}
    >
      <EmReceiptsClient
        permissions={user.permissions}
        roles={user.roles}
        userType={user.userType ?? user.primaryRole}
      />
    </AuthenticatedLayout>
  );
}
