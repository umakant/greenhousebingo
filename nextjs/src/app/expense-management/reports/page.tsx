import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { EmReportsClient } from "@/components/expense-management/em-reports-client";
import { getEmWorkflowCapabilities } from "@/lib/em-expense-workflow";
import { requireEmPageAccess } from "@/lib/require-em-page";
import { t } from "@/lib/admin-t";


export default async function ExpenseManagementReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ created_by_user_id?: string }>;
}) {
  const user = await requireEmPageAccess("/expense-management/reports");
  const workflowCaps = getEmWorkflowCapabilities({
    permissions: user.permissions,
    roles: user.roles,
    userType: user.userType ?? user.primaryRole,
  });
  const { created_by_user_id: createdByUserId } = await searchParams;

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
        { label: t("Reports") },
      ]}
      pageTitle={t("Expense reports")}
    >
      <EmReportsClient createdByUserId={createdByUserId} workflowCaps={workflowCaps} />
    </AuthenticatedLayout>
  );
}
