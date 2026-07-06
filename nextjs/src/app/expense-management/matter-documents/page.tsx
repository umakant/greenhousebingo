import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { EmMatterDocumentsClient } from "@/components/expense-management/em-matter-documents-client";
import { hasEmAdminPermission } from "@/lib/em-access";
import { requireEmPageAccess } from "@/lib/require-em-page";
import { t } from "@/lib/admin-t";


export default async function ExpenseManagementMatterDocumentsPage() {
  const user = await requireEmPageAccess("/expense-management/matter-documents");

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
        { label: t("Documents") },
      ]}
      pageTitle={t("Operations Workspace")}
    >
      <EmMatterDocumentsClient canEdit={hasEmAdminPermission(user.permissions)} />
    </AuthenticatedLayout>
  );
}
