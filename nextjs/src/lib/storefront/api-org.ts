import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { loadStorefrontActorUser, resolveStorefrontOrganizationId, type StorefrontActorUser } from "@/lib/storefront/org-resolution";
import { prisma } from "@/lib/prisma";

export type StorefrontApiOrgOk = {
  ok: true;
  userId: bigint;
  user: StorefrontActorUser;
  organizationId: bigint;
  isSuperadmin: boolean;
};

export type StorefrontApiOrgResult = StorefrontApiOrgOk | { ok: false; response: NextResponse };

/**
 * Resolves tenant `organizationId` from `pf_user_id`.
 * Superadmin may pass `?organizationId=` to act on a company; otherwise returns 403 if no org.
 */
export async function requireStorefrontOrganization(req: NextRequest): Promise<StorefrontApiOrgResult> {
  const uidRaw = req.cookies.get("pf_user_id")?.value?.trim();
  if (!uidRaw) {
    return { ok: false, response: NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 }) };
  }
  let userId: bigint;
  try {
    userId = BigInt(uidRaw);
  } catch {
    return { ok: false, response: NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 }) };
  }

  const user = await loadStorefrontActorUser(userId);
  if (!user) {
    return { ok: false, response: NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 }) };
  }

  const t = (user.type ?? "").trim().toLowerCase();
  const isSuperadmin = t === "superadmin" || t === "super admin";

  const qOrg = req.nextUrl.searchParams.get("organizationId")?.trim();
  let organizationId = resolveStorefrontOrganizationId(user);

  if (isSuperadmin && qOrg && /^\d+$/.test(qOrg)) {
    try {
      organizationId = BigInt(qOrg);
    } catch {
      /* keep */
    }
  }

  if (organizationId == null) {
    return { ok: false, response: NextResponse.json({ ok: false, message: "No organization context." }, { status: 400 }) };
  }

  const exists = await prisma.user.findFirst({
    where: { id: organizationId },
    select: { id: true },
  });
  if (!exists) {
    return { ok: false, response: NextResponse.json({ ok: false, message: "Invalid organization." }, { status: 400 }) };
  }

  return { ok: true as const, userId, user, organizationId, isSuperadmin };
}

export function saasActorFromRequest(req: NextRequest) {
  return {
    actorEmail: req.cookies.get("pf_email")?.value ?? null,
    actorRole: req.cookies.get("pf_role")?.value ?? null,
    path: req.nextUrl?.pathname ?? null,
  };
}
