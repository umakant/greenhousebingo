import type { NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";

type ActorRow = {
  id: bigint;
  type: string | null;
  createdBy: bigint | null;
  creatorId?: bigint | null;
};

/** Tenant org id for Gantt APIs — matches account dashboard / messenger rules. */
export function resolveGanttTenantCompanyId(actor: ActorRow): bigint {
  const t = (actor.type ?? "").trim().toLowerCase();
  if (t === "company" || t === "company_admin") return actor.id;
  return actor.createdBy ?? actor.creatorId ?? actor.id;
}

export async function resolveGanttCompanyFromRequest(
  req: NextRequest,
): Promise<{ companyId: string; companyBigId: bigint } | null> {
  if (!req.cookies.get("pf_role")?.value) return null;

  const userIdRaw = req.cookies.get("pf_user_id")?.value?.trim();
  const email = (req.cookies.get("pf_email")?.value ?? "").trim().toLowerCase();

  let user: ActorRow | null = null;

  if (userIdRaw && /^\d+$/.test(userIdRaw)) {
    user = await prisma.user.findFirst({
      where: { id: BigInt(userIdRaw) },
      select: { id: true, type: true, createdBy: true, creatorId: true },
    });
  }

  if (!user && email) {
    user = await prisma.user.findFirst({
      where: { email },
      select: { id: true, type: true, createdBy: true, creatorId: true },
    });
  }

  if (!user) return null;

  const companyBigId = resolveGanttTenantCompanyId(user);
  return { companyId: String(companyBigId), companyBigId };
}
