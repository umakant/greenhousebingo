import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { RouteDetailClient } from "@/components/projects/route-detail-client";
import { safeJsonParse } from "@/lib/authz";
import { getEmployeeRouteById } from "@/lib/project-routes-data";
import { decodePermissions } from "@/lib/read-user-cookies";
import { t } from "@/lib/admin-t";

type Props = { params: Promise<{ id: string }> };

export default async function ProjectRouteDetailPage({ params }: Props) {
  const { id } = await params;
  const route = getEmployeeRouteById(id);
  if (!route) notFound();

  const store = await cookies();
  const role = store.get("pf_role")?.value;
  if (!role) redirect("/login");

  const name = store.get("pf_name")?.value ?? "User";
  const email = store.get("pf_email")?.value ?? "";
  const roles = safeJsonParse<string[]>(store.get("pf_roles")?.value, []);
  const permissions = await decodePermissions(store.get("pf_permissions")?.value);
  const activatedPackages = safeJsonParse<string[]>(store.get("pf_activated_packages")?.value, []);

  return (
    <AuthenticatedLayout
      user={{ name, email, roles, permissions, activatedPackages }}
      breadcrumbs={[
        { label: t("Routing"), url: "/projects/routes" },
        { label: t("Routes"), url: "/projects/routes" },
        { label: route.employeeName },
      ]}
    >
      <RouteDetailClient route={route} />
    </AuthenticatedLayout>
  );
}
