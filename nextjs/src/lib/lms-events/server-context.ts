import "server-only";

import type { NextRequest } from "next/server";
import { cookies } from "next/headers";

import { safeJsonParse, hasPermission } from "@/lib/authz";
import { isLmsEmployeeLearnerAudience } from "@/lib/lms-employee-learner-audience";
import { createLmsEventDbRepository, lmsEventsDbReady } from "@/lib/lms-events/db-repository";
import { canAccessLmsEventAdmin, canAccessLmsEventAdminFromRequest } from "@/lib/lms-events/admin-access";
import { createLmsEventMockRepository } from "@/lib/lms-events/mock-repository";
import { lmsTenantActorFromRequest } from "@/lib/lms-instructor-context";

export type LmsEventRepository = ReturnType<typeof createLmsEventMockRepository>;

async function resolveRepository(scope: { organizationId: string; studentUserId?: string }): Promise<LmsEventRepository> {
  const useMock = process.env.LMS_EVENTS_USE_MOCK === "true";
  if (!useMock && (await lmsEventsDbReady())) {
    return createLmsEventDbRepository(scope) as unknown as LmsEventRepository;
  }
  return createLmsEventMockRepository(scope);
}

export async function lmsEventMockRepoFromRequest(req: NextRequest) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) return null;
  const roles = safeJsonParse<string[]>(req.cookies.get("pf_roles")?.value, []);
  const primaryRole = req.cookies.get("pf_role")?.value?.trim() ?? roles[0] ?? "";
  if (!isLmsEmployeeLearnerAudience(roles, primaryRole)) return null;
  return resolveRepository({
    organizationId: actor.organizationId.toString(),
    studentUserId: actor.userId.toString(),
  });
}

export async function lmsEventMockRepoFromCookies() {
  const store = await cookies();
  const uidRaw = store.get("pf_user_id")?.value?.trim();
  if (!uidRaw) return null;
  const roles = safeJsonParse<string[]>(store.get("pf_roles")?.value, []);
  const primaryRole = store.get("pf_role")?.value?.trim() ?? roles[0] ?? "";
  if (!isLmsEmployeeLearnerAudience(roles, primaryRole)) return null;

  const { loadTenantActorUser, resolveTenantOrganizationId } = await import("@/lib/lms-organization");
  const user = await loadTenantActorUser(BigInt(uidRaw));
  const organizationId = user ? resolveTenantOrganizationId(user) : null;
  if (!organizationId) return null;

  return resolveRepository({
    organizationId: organizationId.toString(),
    studentUserId: uidRaw,
  });
}

export async function lmsEventAdminRepoFromRequest(req: NextRequest) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) return null;

  const allowed = await canAccessLmsEventAdminFromRequest(req);
  if (!allowed) return null;

  return resolveRepository({
    organizationId: actor.organizationId.toString(),
    studentUserId: actor.userId.toString(),
  });
}

export function canManageLmsEvents(perms: string[]): boolean {
  return canAccessLmsEventAdmin(perms);
}

export function canCheckInLmsEvents(perms: string[]): boolean {
  return (
    canManageLmsEvents(perms) ||
    hasPermission(perms, "manage-lms-event-checkin")
  );
}
