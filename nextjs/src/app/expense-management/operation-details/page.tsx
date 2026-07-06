import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { EmOperationDetailsClient } from "@/components/expense-management/em-operation-details-client";
import { hasEmAdminPermission } from "@/lib/em-access";
import { requireEmPageAccess } from "@/lib/require-em-page";
import { t } from "@/lib/admin-t";


export default async function ExpenseManagementOperationDetailsPage() {
  const user = await requireEmPageAccess("/expense-management/operation-details");

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
        { label: t("Operation Details") },
      ]}
      pageTitle={t("Operations Workspace")}
    >
      <EmOperationDetailsClient canEdit={hasEmAdminPermission(user.permissions)} />
    </AuthenticatedLayout>
  );
}
