import "server-only";

import type { NextRequest } from "next/server";

import { safeJsonParse } from "@/lib/authz";
import { isLmsEmployeeLearnerAudience } from "@/lib/lms-employee-learner-audience";
import { loadTenantActorUser, resolveTenantOrganizationId } from "@/lib/lms-organization";

export type LmsTenantActor = {
  userId: bigint;
  organizationId: bigint;
};

export async function lmsTenantActorFromRequest(req: NextRequest): Promise<LmsTenantActor | null> {
  const uid = req.cookies.get("pf_user_id")?.value?.trim();
  if (!uid) return null;
  let userId: bigint;
  try {
    userId = BigInt(uid);
  } catch {
    return null;
  }
  const user = await loadTenantActorUser(userId);
  const organizationId = user ? resolveTenantOrganizationId(user) : null;
  if (!organizationId) return null;
  return { userId, organizationId };
}

/** Reject company admins calling employee-only learner APIs. */
export function lmsEmployeeLearnerFromRequest(req: NextRequest): boolean {
  const roles = safeJsonParse<string[]>(req.cookies.get("pf_roles")?.value, []);
  const primaryRole = req.cookies.get("pf_role")?.value?.trim() ?? roles[0] ?? "";
  return isLmsEmployeeLearnerAudience(roles, primaryRole);
}
