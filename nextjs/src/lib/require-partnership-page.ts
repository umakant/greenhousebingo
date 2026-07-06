import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { safeJsonParse } from "@/lib/authz";
import { decodePermissions } from "@/lib/read-user-cookies";

export type PartnershipPageUser = {
  name: string;
  email: string;
  roles: string[];
  permissions: string[];
  activatedPackages: string[];
};

/** Server gate for `/partnerships/*` — superadmin only. */
export async function requirePartnershipPage(): Promise<PartnershipPageUser> {
  const store = await cookies();
  const role = store.get("pf_role")?.value;
  if (!role) redirect("/login");
  if (role !== "superadmin") redirect("/dashboard");

  const name = store.get("pf_name")?.value ?? "User";
  const email = store.get("pf_email")?.value ?? "";
  const roles = safeJsonParse<string[]>(store.get("pf_roles")?.value, []);
  const permissions = await decodePermissions(store.get("pf_permissions")?.value);
  const activatedPackages = safeJsonParse<string[]>(store.get("pf_activated_packages")?.value, []);

  return { name, email, roles, permissions, activatedPackages };
}
