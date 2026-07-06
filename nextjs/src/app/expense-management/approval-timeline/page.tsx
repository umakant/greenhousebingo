import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { EmApprovalTimelineClient } from "@/components/expense-management/em-approval-timeline-client";
import { requireEmPageAccess } from "@/lib/require-em-page";
import { t } from "@/lib/admin-t";


export default async function ExpenseManagementApprovalTimelinePage() {
  const user = await requireEmPageAccess("/expense-management/approval-timeline");

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
        { label: t("Approval Timeline") },
      ]}
      pageTitle={t("Operations Workspace")}
    >
      <EmApprovalTimelineClient />
    </AuthenticatedLayout>
  );
}
