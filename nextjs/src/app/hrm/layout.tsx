import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { safeJsonParse } from "@/lib/authz";
import { resolveEmployeePortalLoginHome } from "@/lib/hrm-employee-role";
import { decodePermissions } from "@/lib/read-user-cookies";

/**
 * Employee portal users (staff) use Expense Management, not HRM admin screens.
 * Redirect them away from /hrm/* if they open an old bookmark or shared link.
 */
export default async function HrmLayout({ children }: { children: React.ReactNode }) {
  const store = await cookies();
  const roles = safeJsonParse<string[]>(store.get("pf_roles")?.value, []);
  const isStaff =
    roles.map((r) => r.trim().toLowerCase()).includes("staff") ||
    (store.get("pf_role")?.value ?? "").trim().toLowerCase() === "staff";

  if (isStaff) {
    const permissions = await decodePermissions(store.get("pf_permissions")?.value);
    const activatedPackages = safeJsonParse<string[]>(store.get("pf_activated_packages")?.value, []);
    redirect(resolveEmployeePortalLoginHome(activatedPackages, permissions));
  }

  return children;
}
