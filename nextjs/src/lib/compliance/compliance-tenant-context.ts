import "server-only";

import type { NextRequest } from "next/server";

import { loadTenantActorUser, resolveTenantOrganizationId } from "@/lib/lms-organization";
import { prisma } from "@/lib/prisma";

export type ComplianceTenantActor = {
  userId: bigint;
  organizationId: bigint;
  name: string | null;
  email: string | null;
};

export async function complianceTenantActorFromRequest(
  req: NextRequest,
): Promise<ComplianceTenantActor | null> {
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

  const profile = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });

  return {
    userId,
    organizationId,
    name: profile?.name ?? null,
    email: profile?.email ?? null,
  };
}
