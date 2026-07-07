import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getActivatedPackagesForUser } from "@/lib/addons-server";
import { safeJsonParse } from "@/lib/authz";
import {
  userHasAnyEventPlatformPermission,
  userHasEventPlatformPermission,
  type EventPlatformPermission,
} from "@/lib/event-platform/permissions";
import { decodePermissions } from "@/lib/read-user-cookies";
import { writeSaasAuditLog } from "@/lib/saas-audit-log";

export type EventPlatformPageUser = {
  name: string;
  email: string;
  roles: string[];
  permissions: string[];
  activatedPackages: string[];
  primaryRole?: string;
};

async function loadActivatedPackages(uidRaw: string, roles: string[]): Promise<string[]> {
  let activated = safeJsonParse<string[]>(
    (await cookies()).get("pf_activated_packages")?.value,
    [],
  ).map((p) => String(p).toLowerCase());
  try {
    const id = BigInt(uidRaw);
    const isSuper = roles.includes("superadmin") || roles.includes("super_admin");
    activated = (await getActivatedPackagesForUser(id, isSuper)).map((p) => p.toLowerCase());
  } catch {
    /* keep cookie */
  }
  return activated;
}

export async function requireEventPlatformPageAccess(
  pathForAudit: string,
  requiredPermission: EventPlatformPermission | string,
  opts?: { auditSuccess?: boolean },
): Promise<EventPlatformPageUser> {
  return requireEventPlatformPageAccessAny(pathForAudit, [requiredPermission], opts);
}

export async function requireEventPlatformPageAccessAny(
  pathForAudit: string,
  requiredPermissions: string[],
  opts?: { auditSuccess?: boolean },
): Promise<EventPlatformPageUser> {
  const store = await cookies();
  const role = store.get("pf_role")?.value;
  if (!role) redirect("/login");

  const email = store.get("pf_email")?.value ?? "";
  const name = store.get("pf_name")?.value ?? "User";
  const roles = safeJsonParse<string[]>(store.get("pf_roles")?.value, []);
  const primaryRole = store.get("pf_role")?.value?.trim() ?? roles[0] ?? "";
  const permissions = await decodePermissions(store.get("pf_permissions")?.value);

  const uidRaw = store.get("pf_user_id")?.value?.trim() ?? "";
  const activated = uidRaw ? await loadActivatedPackages(uidRaw, roles) : [];

  if (!activated.includes("eventplatform")) {
    await writeSaasAuditLog({
      eventType: "event_platform_access_denied",
      module: "EventPlatform",
      actorEmail: email || null,
      actorRole: role,
      path: pathForAudit,
      metadata: { reason: "addon_disabled_plan_or_org" },
    });
    redirect("/dashboard");
  }

  const allowed = requiredPermissions.some((p) => userHasEventPlatformPermission(permissions, p));
  if (!allowed) {
    await writeSaasAuditLog({
      eventType: "event_platform_access_denied",
      module: "EventPlatform",
      actorEmail: email || null,
      actorRole: role,
      path: pathForAudit,
      metadata: { reason: "missing_permission", required: requiredPermissions },
    });
    redirect(EVENT_PLATFORM_FALLBACK_PATH);
  }

  if (opts?.auditSuccess) {
    await writeSaasAuditLog({
      eventType: "event_platform_access_granted",
      module: "EventPlatform",
      actorEmail: email || null,
      actorRole: role,
      path: pathForAudit,
    });
  }

  return {
    name,
    email,
    roles,
    permissions,
    activatedPackages: activated,
    primaryRole,
  };
}

/** When user lacks section permission but may access dashboard. */
export const EVENT_PLATFORM_FALLBACK_PATH = "/admin/event-platform";

export function userMayAccessEventPlatformNav(permissions: string[], required: string): boolean {
  return userHasEventPlatformPermission(permissions, required);
}

export function userMayAccessAnyEventPlatformNav(permissions: string[], required: string[]): boolean {
  return userHasAnyEventPlatformPermission(permissions, required);
}
