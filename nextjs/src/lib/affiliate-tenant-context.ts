import "server-only";

import type { NextRequest } from "next/server";

import { loadTenantActorUser, resolveTenantOrganizationId } from "@/lib/lms-organization";

export type AffiliateTenantActor = {
  userId: bigint;
  organizationId: bigint;
};

export async function affiliateTenantActorFromRequest(req: NextRequest): Promise<AffiliateTenantActor | null> {
  const uidRaw = req.cookies.get("pf_user_id")?.value?.trim();
  if (!uidRaw || !/^\d+$/.test(uidRaw)) return null;

  let userId: bigint;
  try {
    userId = BigInt(uidRaw);
  } catch {
    return null;
  }

  const user = await loadTenantActorUser(userId);
  if (!user) return null;

  const organizationId = resolveTenantOrganizationId(user);
  if (!organizationId) return null;

  return { userId, organizationId };
}
