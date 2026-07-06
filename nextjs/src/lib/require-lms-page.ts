import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getActivatedPackagesForUser } from "@/lib/addons-server";
import { safeJsonParse } from "@/lib/authz";
import { isLmsEmployeeLearnerAudience } from "@/lib/lms-employee-learner-audience";
import { decodePermissions } from "@/lib/read-user-cookies";
import { writeSaasAuditLog } from "@/lib/saas-audit-log";

export type LmsPageUser = {
  name: string;
  email: string;
  roles: string[];
  permissions: string[];
  activatedPackages: string[];
  primaryRole?: string;
};

export function userMayAccessLmsPermission(permissions: string[], required: string): boolean {
  if (permissions.includes("*")) return true;
  if (permissions.includes("manage-lms")) return true;
  return permissions.includes(required);
}

/**
 * Server gate for `/lms/*`: add-on + org opt-in (via activated packages cookie refresh),
 * then section permission (or umbrella `manage-lms`).
 */
/** When any one of the listed LMS permissions is sufficient (e.g. catalog vs instructor views). */
export async function requireLmsPageAccessAny(
  pathForAudit: string,
  requiredPermissions: string[],
  opts?: { auditSuccess?: boolean },
): Promise<LmsPageUser> {
  const store = await cookies();
  const role = store.get("pf_role")?.value;
  if (!role) redirect("/login");

  const email = store.get("pf_email")?.value ?? "";
  const name = store.get("pf_name")?.value ?? "User";
  const roles = safeJsonParse<string[]>(store.get("pf_roles")?.value, []);
  const primaryRole = store.get("pf_role")?.value?.trim() ?? roles[0] ?? "";
  const permissions = await decodePermissions(store.get("pf_permissions")?.value);

  const uidRaw = store.get("pf_user_id")?.value?.trim();
  let activated = safeJsonParse<string[]>(store.get("pf_activated_packages")?.value, []).map((p) =>
    String(p).toLowerCase(),
  );
  if (uidRaw) {
    try {
      const id = BigInt(uidRaw);
      const isSuper = roles.includes("superadmin") || roles.includes("super_admin");
      activated = (await getActivatedPackagesForUser(id, isSuper)).map((p) => p.toLowerCase());
    } catch {
      /* keep cookie */
    }
  }

  if (!activated.includes("lms")) {
    await writeSaasAuditLog({
      eventType: "lms_access_denied",
      module: "Lms",
      actorEmail: email || null,
      actorRole: role,
      path: pathForAudit,
      metadata: { reason: "addon_disabled_plan_or_org" },
    });
    redirect("/dashboard");
  }

  const allowed = requiredPermissions.some((p) => userMayAccessLmsPermission(permissions, p));
  if (!allowed) {
    await writeSaasAuditLog({
      eventType: "lms_access_denied",
      module: "Lms",
      actorEmail: email || null,
      actorRole: role,
      path: pathForAudit,
      metadata: { reason: "missing_permission", required: requiredPermissions },
    });
    redirect("/dashboard");
  }

  if (opts?.auditSuccess) {
    await writeSaasAuditLog({
      eventType: "lms_access",
      module: "Lms",
      actorEmail: email || null,
      actorRole: role,
      path: pathForAudit,
      metadata: { permission: requiredPermissions.find((p) => userMayAccessLmsPermission(permissions, p)) ?? null },
    });
  }

  return { name, email, roles, permissions, activatedPackages: activated, primaryRole };
}

export async function requireLmsPageAccess(
  pathForAudit: string,
  requiredPermission: string,
  opts?: { auditSuccess?: boolean },
): Promise<LmsPageUser> {
  return requireLmsPageAccessAny(pathForAudit, [requiredPermission], opts);
}

/**
 * LMS learner catalog / course outline: requires login + LMS add-on only (no manage-* permission).
 * Use for pages that mirror `GET /api/lms/courses?view=learner` and `/api/lms/courses/{id}/learn`.
 */
export async function requireLmsLearnerCatalogPage(pathForAudit: string): Promise<LmsPageUser> {
  const store = await cookies();
  const role = store.get("pf_role")?.value;
  if (!role) redirect("/login");

  const email = store.get("pf_email")?.value ?? "";
  const name = store.get("pf_name")?.value ?? "User";
  const roles = safeJsonParse<string[]>(store.get("pf_roles")?.value, []);
  const primaryRole = store.get("pf_role")?.value?.trim() ?? roles[0] ?? "";
  const permissions = await decodePermissions(store.get("pf_permissions")?.value);

  const uidRaw = store.get("pf_user_id")?.value?.trim();
  let activated = safeJsonParse<string[]>(store.get("pf_activated_packages")?.value, []).map((p) =>
    String(p).toLowerCase(),
  );
  if (uidRaw) {
    try {
      const id = BigInt(uidRaw);
      const isSuper = roles.includes("superadmin") || roles.includes("super_admin");
      activated = (await getActivatedPackagesForUser(id, isSuper)).map((p) => p.toLowerCase());
    } catch {
      /* keep cookie */
    }
  }

  if (!activated.includes("lms")) {
    await writeSaasAuditLog({
      eventType: "lms_access_denied",
      module: "Lms",
      actorEmail: email || null,
      actorRole: role,
      path: pathForAudit,
      metadata: { reason: "addon_disabled_plan_or_org" },
    });
    redirect("/dashboard");
  }

  return { name, email, roles, permissions, activatedPackages: activated, primaryRole };
}

/**
 * Employee / student learner pages (My Learning, student portal).
 * Company admins with plan LMS permissions are redirected to the LMS admin dashboard.
 */
export async function requireLmsEmployeeLearnerPage(pathForAudit: string): Promise<LmsPageUser> {
  const user = await requireLmsLearnerCatalogPage(pathForAudit);
  if (isLmsEmployeeLearnerAudience(user.roles, user.primaryRole)) {
    return user;
  }

  await writeSaasAuditLog({
    eventType: "lms_access_denied",
    module: "Lms",
    actorEmail: user.email || null,
    actorRole: user.primaryRole ?? user.roles[0] ?? null,
    path: pathForAudit,
    metadata: { reason: "employee_learner_only" },
  });
  redirect("/lms/dashboard");
}
