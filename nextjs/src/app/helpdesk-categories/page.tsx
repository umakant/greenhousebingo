import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import AuthenticatedLayout from "@/layouts/authenticated-layout";
import HelpdeskCategoriesAdmin from "@/components/helpdesk/helpdesk-categories-admin";
import HelpdeskCategoriesActions from "@/components/helpdesk/helpdesk-categories-actions";
import { hasPermission, safeJsonParse } from "@/lib/authz";
import { decodePermissions } from '@/lib/read-user-cookies';
import { t } from "@/lib/admin-t";


export default async function HelpdeskCategoriesPage() {
  const store = await cookies();
  const role = store.get("pf_role")?.value;
  if (!role) redirect("/login");

  const name = store.get("pf_name")?.value ?? "User";
  const email = store.get("pf_email")?.value ?? "";
  const roles = safeJsonParse<string[]>(store.get("pf_roles")?.value, []);
  const permissions = await decodePermissions(store.get('pf_permissions')?.value);
  const activatedPackages = safeJsonParse<string[]>(store.get("pf_activated_packages")?.value, []);

  if (!hasPermission(permissions, "manage-helpdesk-categories") && !permissions.includes("*")) {
    redirect("/dashboard");
  }

  const canCreate = hasPermission(permissions, "create-helpdesk-categories") || permissions.includes("*");

  return (
    <AuthenticatedLayout
      user={{ name, email, roles, permissions, activatedPackages }}
      breadcrumbs={[{ label: t("Helpdesk Categories") }]}
      pageTitle={t("Manage Helpdesk Categories")}
      pageActions={<HelpdeskCategoriesActions canCreate={canCreate} />}
    >
      <HelpdeskCategoriesAdmin permissions={permissions} />
    </AuthenticatedLayout>
  );
}

