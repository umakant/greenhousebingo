import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { EmCostTransferClient } from "@/components/expense-management/em-cost-transfer-client";
import { hasEmAdminPermission } from "@/lib/em-access";
import { requireEmPageAccess } from "@/lib/require-em-page";
import { t } from "@/lib/admin-t";


export default async function ExpenseManagementCostTransferPage() {
  const user = await requireEmPageAccess("/expense-management/cost-transfer");

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
        { label: t("Cost Transfer Details") },
      ]}
      pageTitle={t("Operations Workspace")}
    >
      <EmCostTransferClient canEdit={hasEmAdminPermission(user.permissions)} />
    </AuthenticatedLayout>
  );
}
