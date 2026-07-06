import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { hasPermission } from "@/lib/authz";
import { decodePermissions } from "@/lib/read-user-cookies";

export default async function ProjectEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const store = await cookies();
  const role = store.get("pf_role")?.value;
  if (!role) redirect("/login");

  const permissions = await decodePermissions(store.get("pf_permissions")?.value);
  const canEdit =
    permissions.includes("*") ||
    hasPermission(permissions, "edit-project") ||
    hasPermission(permissions, "manage-project") ||
    hasPermission(permissions, "manage-project-dashboard");
  if (!canEdit) redirect("/dashboard");

  redirect(`/projects?edit=${id}`);
}
