import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { EmMatterNotesClient } from "@/components/expense-management/em-matter-notes-client";
import { requireEmPageAccess } from "@/lib/require-em-page";
import { cookies } from "next/headers";
import { t } from "@/lib/admin-t";


export default async function ExpenseManagementMatterNotesPage() {
  const user = await requireEmPageAccess("/expense-management/matter-notes");
  const store = await cookies();
  const currentUserId = store.get("pf_user_id")?.value?.trim() || null;

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
        { label: t("Notes") },
      ]}
      pageTitle={t("Operations Workspace")}
    >
      <EmMatterNotesClient permissions={user.permissions} currentUserId={currentUserId} />
    </AuthenticatedLayout>
  );
}
