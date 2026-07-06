import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { hasPermission } from "@/lib/authz";
import { decodePermissions } from "@/lib/read-user-cookies";

export default async function NewProjectPage() {
  const store = await cookies();
  const role = store.get("pf_role")?.value;
  if (!role) redirect("/login");

  const permissions = await decodePermissions(store.get("pf_permissions")?.value);
  const canCreate =
    permissions.includes("*") ||
    hasPermission(permissions, "create-project") ||
    hasPermission(permissions, "manage-project");
  if (!canCreate) redirect("/dashboard");

  redirect("/projects?create=1");
}
