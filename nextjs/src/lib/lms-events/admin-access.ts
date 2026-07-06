import "server-only";

import type { NextRequest } from "next/server";

import { hasPermission } from "@/lib/authz";
import { getEffectivePermissionNamesForUser } from "@/lib/effective-user-permissions";
import {
  IMPERSONATOR_LEGACY_COOKIE,
  IMPERSONATOR_STACK_COOKIE,
  parseImpersonatorStack,
} from "@/lib/impersonation-stack";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";

export function canAccessLmsEventAdmin(perms: string[]): boolean {
  return (
    perms.includes("*") ||
    hasPermission(perms, "manage-lms") ||
    hasPermission(perms, "manage-lms-events") ||
    hasPermission(perms, "view-lms-events")
  );
}

function resolveImpersonatorUserId(req: NextRequest): string | null {
  const currentUserId = req.cookies.get("pf_user_id")?.value?.trim() ?? "";
  const stack = parseImpersonatorStack(req.cookies.get(IMPERSONATOR_STACK_COOKIE)?.value);
  const legacy = req.cookies.get(IMPERSONATOR_LEGACY_COOKIE)?.value?.trim();
  const candidates = [...stack];
  if (legacy && legacy !== currentUserId) candidates.push(legacy);
  return [...candidates].reverse().find((id) => id && id !== currentUserId) ?? null;
}

/** Session permissions, elevated to impersonator LMS admin perms when impersonating. */
export async function getLmsEventAdminPermissionsFromRequest(req: NextRequest): Promise<string[]> {
  const sessionPerms = await getPermissionsFromRequest(req);
  if (canAccessLmsEventAdmin(sessionPerms)) return sessionPerms;

  const impersonatorId = resolveImpersonatorUserId(req);
  if (!impersonatorId) return sessionPerms;

  try {
    const impersonatorPerms = await getEffectivePermissionNamesForUser(BigInt(impersonatorId));
    if (!canAccessLmsEventAdmin(impersonatorPerms)) return sessionPerms;
    return [...new Set([...sessionPerms, ...impersonatorPerms])];
  } catch {
    return sessionPerms;
  }
}

export async function canAccessLmsEventAdminFromRequest(req: NextRequest): Promise<boolean> {
  const perms = await getLmsEventAdminPermissionsFromRequest(req);
  return canAccessLmsEventAdmin(perms);
}
