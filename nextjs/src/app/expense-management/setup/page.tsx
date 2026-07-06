import AuthenticatedLayout from "@/layouts/authenticated-layout";
import EmSetupAdmin from "@/components/expense-management/em-setup-admin";
import { requireEmPageAccess } from "@/lib/require-em-page";
import { t } from "@/lib/admin-t";


export default async function ExpenseManagementSetupPage() {
  const user = await requireEmPageAccess("/expense-management/setup");

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
        { label: t("System Setup") },
      ]}
      pageTitle={t("System Setup")}
    >
      <EmSetupAdmin permissions={user.permissions} />
    </AuthenticatedLayout>
  );
}
