import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { ProjectSetup } from "@/components/project-setup";
import { hasPermission, safeJsonParse } from "@/lib/authz";
import { decodePermissions } from '@/lib/read-user-cookies';
import { t } from "@/lib/admin-t";


export default async function ProjectSetupPage() {
  const store = await cookies();
  const role = store.get("pf_role")?.value;
  if (!role) redirect("/login");

  const permissions = await decodePermissions(store.get('pf_permissions')?.value);
  const canAccessSetup =
    permissions.includes("*") ||
    hasPermission(permissions, "manage-task-stages") ||
    hasPermission(permissions, "manage-project-dashboard") ||
    hasPermission(permissions, "manage-project");
  if (!canAccessSetup) redirect("/project/dashboard");

  const name = store.get("pf_name")?.value ?? "User";
  const email = store.get("pf_email")?.value ?? "";
  const roles = safeJsonParse<string[]>(store.get("pf_roles")?.value, []);
  const activatedPackages = safeJsonParse<string[]>(store.get("pf_activated_packages")?.value, []);

  return (
    <AuthenticatedLayout
      user={{ name, email, roles, permissions, activatedPackages }}
      breadcrumbs={[
        { label: t("Project Dashboard"), url: "/project/dashboard" },
        { label: t("System Setup") },
      ]}
      pageTitle={t("System Setup")}
    >
      <ProjectSetup />
    </AuthenticatedLayout>
  );
}
