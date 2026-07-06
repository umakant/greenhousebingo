import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { loadStorefrontActorUser, resolveStorefrontOrganizationId } from "@/lib/storefront/org-resolution";

export type StorefrontWebsiteMutationOk = {
  organizationId: bigint;
  websiteId: bigint;
};

/**
 * Ensures the actor may update the given storefront website (tenant match, or superadmin).
 */
export async function assertStorefrontWebsiteMutationAllowed(
  req: NextRequest,
  websiteId: bigint,
): Promise<{ ok: true; data: StorefrontWebsiteMutationOk } | { ok: false; response: NextResponse }> {
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
  const isSuper = t === "superadmin" || t === "super admin";

  const website = await prisma.website.findFirst({
    where: { id: websiteId },
    select: { id: true, organizationId: true },
  });
  if (!website) {
    return { ok: false, response: NextResponse.json({ ok: false, message: "Website not found." }, { status: 404 }) };
  }

  const actorOrg = resolveStorefrontOrganizationId(user);
  if (actorOrg != null) {
    if (actorOrg !== website.organizationId) {
      return { ok: false, response: NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 }) };
    }
  } else if (!isSuper) {
    return { ok: false, response: NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 }) };
  }

  return { ok: true, data: { organizationId: website.organizationId, websiteId: website.id } };
}
