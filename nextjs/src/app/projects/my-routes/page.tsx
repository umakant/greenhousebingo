import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { MyRoutesClient } from "@/components/projects/my-routes-client";
import { safeJsonParse } from "@/lib/authz";
import { getEmployeeRouteForUser } from "@/lib/project-routes-data";
import { decodePermissions } from "@/lib/read-user-cookies";
import { t } from "@/lib/admin-t";

export default async function MyRoutesPage() {
  const store = await cookies();
  const role = store.get("pf_role")?.value;
  if (!role) redirect("/login");

  const name = store.get("pf_name")?.value ?? "User";
  const email = store.get("pf_email")?.value ?? "";
  const roles = safeJsonParse<string[]>(store.get("pf_roles")?.value, []);
  const permissions = await decodePermissions(store.get("pf_permissions")?.value);
  const activatedPackages = safeJsonParse<string[]>(store.get("pf_activated_packages")?.value, []);

  const canAccess = permissions.includes("manage-routing-my-routes");

  if (!canAccess) redirect("/launchpad");

  const route = getEmployeeRouteForUser(name, email);

  return (
    <AuthenticatedLayout
      user={{ name, email, roles, permissions, activatedPackages }}
      breadcrumbs={[
        { label: t("Routing"), url: "/projects/my-routes" },
        { label: t("My Routes") },
      ]}
    >
      <MyRoutesClient route={route ?? null} />
    </AuthenticatedLayout>
  );
}
