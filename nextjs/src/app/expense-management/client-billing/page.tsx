import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { EmClientBillingClient } from "@/components/expense-management/em-client-billing-client";
import { requireEmPageAccess } from "@/lib/require-em-page";
import { t } from "@/lib/admin-t";


export default async function ExpenseManagementClientBillingPage() {
  const user = await requireEmPageAccess("/expense-management/client-billing");

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
        { label: t("Client Billing Summary") },
      ]}
      pageTitle={t("Operations Workspace")}
    >
      <EmClientBillingClient />
    </AuthenticatedLayout>
  );
}
