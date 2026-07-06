import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";
import { loadStorefrontActorUser, resolveStorefrontOrganizationId } from "@/lib/storefront/org-resolution";
import { computeStorefrontSetupOverview, type StorefrontSetupOverviewPayload } from "@/lib/storefront/setup-status";

export type StorefrontOverviewLoadResult =
  | { kind: "unauthenticated" }
  | { kind: "no_organization" }
  | { kind: "ready"; overview: StorefrontSetupOverviewPayload };

/** Minimal cookie interface (RSC `cookies()` or `NextRequest.cookies`). */
export type StorefrontSessionCookieJar = {
  get(name: string): { value?: string } | undefined;
};

function parseWebsiteIdParam(raw: string | undefined): bigint | undefined {
  if (!raw || !/^\d+$/.test(raw.trim())) return undefined;
  try {
    return BigInt(raw.trim());
  } catch {
    return undefined;
  }
}

/**
 * Core loader: resolves tenant + optional focus website from `pf_user_id`, then computes checklist.
 * Use from RSC, Route Handlers, or tests by passing the same cookie jar shape.
 */
export async function loadStorefrontSetupOverviewFromSession(
  websiteIdParam: string | undefined,
  jar: StorefrontSessionCookieJar,
): Promise<StorefrontOverviewLoadResult> {
  const uidRaw = jar.get("pf_user_id")?.value?.trim();
  if (!uidRaw) return { kind: "unauthenticated" };

  let userId: bigint;
  try {
    userId = BigInt(uidRaw);
  } catch {
    return { kind: "unauthenticated" };
  }

  const user = await loadStorefrontActorUser(userId);
  if (!user) return { kind: "unauthenticated" };

  const t = (user.type ?? "").trim().toLowerCase();
  const isSuper = t === "superadmin" || t === "super admin";

  let organizationId = resolveStorefrontOrganizationId(user);
  const wid = parseWebsiteIdParam(websiteIdParam);
  let focusWebsiteId: bigint | undefined;

  if (wid != null) {
    if (organizationId != null) {
      const ok = await prisma.website.findFirst({
        where: { id: wid, organizationId },
        select: { id: true },
      });
      if (ok) focusWebsiteId = ok.id;
    } else if (isSuper) {
      const row = await prisma.website.findFirst({
        where: { id: wid },
        select: { id: true, organizationId: true },
      });
      if (row) {
        organizationId = row.organizationId;
        focusWebsiteId = row.id;
      }
    }
  }

  if (organizationId == null) {
    return { kind: "no_organization" };
  }

  const overview = await computeStorefrontSetupOverview(prisma, organizationId, { focusWebsiteId });
  return { kind: "ready", overview };
}

/**
 * Resolves tenant scope from session cookies and optional `websiteId` query (superadmin may target a website).
 */
export async function loadStorefrontSetupOverviewForMerchantUi(
  websiteIdParam: string | undefined,
): Promise<StorefrontOverviewLoadResult> {
  const jar = await cookies();
  return loadStorefrontSetupOverviewFromSession(websiteIdParam, jar);
}
